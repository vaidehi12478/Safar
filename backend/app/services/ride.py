import asyncio
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.schemas.ride import RideRequest
from app.services.geocoding import search_location
from app.services.routing import get_distance_and_fare
from app.models import Ride, Location, RideStatusEnum
from app.services.dispatch import dispatch_ride_task


# Keep strong references to background tasks to prevent garbage collection
background_tasks = set()

async def create_ride(ride_request: RideRequest, user_id: int, db: AsyncSession):
    # 1. Geocode both locations + fetch route/fare simultaneously
    # (These are I/O calls to external APIs, not DB operations, so concurrent is fine)
    try:
        pickup_data, destination_data = await asyncio.gather(
            search_location(ride_request.pickup_query),
            search_location(ride_request.destination_query),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 2. Now that we have coordinates, fetch route info (single GraphHopper call)
    route_info = await get_distance_and_fare(
        pickup_data["latitude"], pickup_data["longitude"],
        destination_data["latitude"], destination_data["longitude"],
    )

    # 3. Upsert both locations sequentially (asyncpg doesn't support concurrent DB ops on same connection)
    pickup = await _upsert_location(db, pickup_data)
    destination = await _upsert_location(db, destination_data)

    # 4. Create ride with locked-in fare
    ride = Ride(
        riderId=user_id,
        pickupLocationId=pickup.id,
        destinationLocationId=destination.id,
        status=RideStatusEnum.REQUESTED,
        price=route_info["estimated_fare"],
        distanceKm=route_info["distance_km"],
    )
    db.add(ride)
    await db.flush()
    ride_id = ride.id
    await db.commit()

    # 5. Reload ride with relationships
    result = await db.execute(
        select(Ride)
        .where(Ride.id == ride_id)
        .options(selectinload(Ride.pickup_location), selectinload(Ride.destination_location))
    )
    ride = result.scalars().unique().first()
    
    # 6. Attach estimate to response
    ride.estimate = route_info
    
    # Start auto-dispatch in background with a strong reference
    task = asyncio.create_task(dispatch_ride_task(ride.id))
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    
    return ride


async def _upsert_location(db: AsyncSession, data: dict):
    """Insert location if not already cached by place_id"""
    place_id = str(data.get("place_id")) if data.get("place_id") else None
    
    if place_id:
        result = await db.execute(select(Location).where(Location.placeId == place_id))
        existing = result.scalars().first()
        if existing:
            return existing

    location = Location(
        placeId=place_id,
        displayName=data["display_name"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        name=data.get("name"),
        road=data.get("road"),
        city=data.get("city"),
        postcode=data.get("postcode"),
        country=data.get("country"),
        countryCode=data.get("country_code"),
    )
    db.add(location)
    await db.flush()
    return location


async def cancel_ride_by_rider(ride_id: int, user_id: int, db: AsyncSession):
    from app.models import Driver, DriverStatusEnum
    from app.api.routers.tracking import broadcast_ride_status

    # Get the ride to ensure it exists and belongs to the rider, including relationships for response
    result = await db.execute(
        select(Ride)
        .options(
            selectinload(Ride.pickup_location),
            selectinload(Ride.destination_location),
            selectinload(Ride.driver),
        )
        .where(Ride.id == ride_id, Ride.riderId == user_id)
    )
    ride = result.scalars().first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found or you are not authorized to cancel it"
        )

    if ride.status not in (RideStatusEnum.REQUESTED, RideStatusEnum.MATCHED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel ride from status {ride.status.value}"
        )

    # If already matched, we need to free the driver
    if ride.status == RideStatusEnum.MATCHED and ride.driverId:
        driver_result = await db.execute(
            select(Driver).where(Driver.id == ride.driverId)
        )
        driver = driver_result.scalars().first()
        if driver:
            driver.status = DriverStatusEnum.ONLINE

    # Cancel the ride
    ride.status = RideStatusEnum.CANCELLED
    
    await db.commit()
    
    # Re-fetch with relationships after commit to avoid MissingGreenlet error during serialization
    result = await db.execute(
        select(Ride)
        .options(
            selectinload(Ride.pickup_location),
            selectinload(Ride.destination_location),
            selectinload(Ride.driver),
        )
        .where(Ride.id == ride_id)
    )
    ride = result.scalars().first()

    # Broadcast status change to the WebSocket Room
    await broadcast_ride_status(ride_id, "CANCELLED", {"message": "The ride was cancelled by the rider."})

    return ride