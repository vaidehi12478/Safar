import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_roles
from app.models import User, Ride, RideStatusEnum, Driver, DriverStatusEnum
from app.models.carpool_group import CarpoolGroup, CarpoolGroupStatusEnum
from app.schemas.carpool import CarpoolGroupResponse, CarpoolEstimateResponse
from app.services.geocoding import search_location
from app.services.routing import get_distance_and_fare, estimate_carpool_fare_simple
from config.database import get_db

router = APIRouter()


@router.get("/groups/{group_id}", response_model=CarpoolGroupResponse)
async def get_group_status(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Poll carpool group status.
    Riders call this every few seconds to see how many people joined
    and how much time is left in the matching window.
    """
    result = await db.execute(
        select(CarpoolGroup)
        .options(selectinload(CarpoolGroup.rides))
        .where(CarpoolGroup.id == group_id)
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Carpool group not found")

    # Ensure only a member of the group can see it
    rider_ids = [r.riderId for r in group.rides]
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if current_user.id not in rider_ids and role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not a member of this group")

    return {
        "id": group.id,
        "status": group.status.value,
        "maxSeats": group.maxSeats,
        "rider_count": len(group.rides),
        "expires_at": group.expiresAt,
        "waypoint_order": group.waypointOrder,
    }


@router.get("/estimate", response_model=CarpoolEstimateResponse)
async def estimate_carpool(
    pickup_query: str,
    destination_query: str,
    assumed_passengers: int = 2,
    current_user: User = Depends(require_roles("RIDER", "ADMIN")),
):
    """
    Show the rider estimated fare BEFORE booking.
    Compares solo vs carpool price.
    """
    try:
        pickup_data, dest_data = await asyncio.gather(
            search_location(pickup_query),
            search_location(destination_query),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    route = await get_distance_and_fare(
        pickup_data["latitude"], pickup_data["longitude"],
        dest_data["latitude"], dest_data["longitude"],
    )
    estimate = estimate_carpool_fare_simple(route["distance_km"], assumed_passengers)
    return estimate


@router.post("/groups/{group_id}/dropoff/{ride_id}")
async def dropoff_rider(
    group_id: int,
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Driver calls this to mark one rider as dropped off.
    When all riders are dropped off → group closes, driver goes ONLINE.
    """
    from app.api.routers.tracking import broadcast_ride_status

    result = await db.execute(
        select(CarpoolGroup)
        .options(selectinload(CarpoolGroup.rides))
        .where(CarpoolGroup.id == group_id)
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Find the specific ride
    ride = next((r for r in group.rides if r.id == ride_id), None)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not in this group")

    ride.status = RideStatusEnum.COMPLETED

    # Check if ALL rides are now completed
    all_done = all(r.status == RideStatusEnum.COMPLETED for r in group.rides)
    if all_done:
        group.status = CarpoolGroupStatusEnum.COMPLETED
        if group.driverId:
            driver = await db.get(Driver, group.driverId)
            if driver:
                driver.status = DriverStatusEnum.ONLINE
                # Add earnings from all rides in the group
                total_earned = sum(r.price or 0 for r in group.rides)
                driver.totalEarnings += total_earned
                driver.walletBalance += total_earned

    await db.commit()

    # Notify the dropped-off rider
    await broadcast_ride_status(ride_id, "COMPLETED", {
        "message": "You have been dropped off. Thanks for riding with Safar!"
    })

    return {"message": "Rider dropped off", "all_complete": all_done}


@router.post("/groups/{group_id}/cancel")
async def cancel_carpool_seat(
    group_id: int,
    current_user: User = Depends(require_roles("RIDER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """
    Rider leaves the carpool group before it dispatches.
    If they are the last rider, the group is cancelled.
    """
    result = await db.execute(
        select(CarpoolGroup)
        .options(selectinload(CarpoolGroup.rides))
        .where(CarpoolGroup.id == group_id)
    )
    group = result.scalars().first()
    if not group or group.status != CarpoolGroupStatusEnum.WAITING:
        raise HTTPException(status_code=400, detail="Cannot cancel at this stage")

    # Find this rider's ride in the group
    ride = next((r for r in group.rides if r.riderId == current_user.id), None)
    if not ride:
        raise HTTPException(status_code=403, detail="You are not in this group")

    ride.status = RideStatusEnum.CANCELLED
    ride.carpoolGroupId = None

    remaining = [r for r in group.rides if r.id != ride.id and r.status != RideStatusEnum.CANCELLED]
    if not remaining:
        group.status = CarpoolGroupStatusEnum.CANCELLED

    await db.commit()
    return {"message": "Left the carpool group"}
