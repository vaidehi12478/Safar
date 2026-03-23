import asyncio
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.schemas.ride import RideRequest
from app.services.geocoding import search_location
from app.services.routing import get_distance_and_fare
from app.models import Ride, Location, RideStatusEnum


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