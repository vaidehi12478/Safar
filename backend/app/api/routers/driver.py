from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_driver_profile, require_roles
from app.models import User, Driver
from app.schemas.driver import (
    AvailableRideListResponse,
    CurrentRideResponse,
    DriverLocationResponse,
    DriverLocationUpdate,
    DriverRideActionResponse,
    DriverStatusResponse,
    DriverStatusUpdate,
)
from app.services import driver as driver_service
from config.database import get_db

router = APIRouter()


@router.get("/rides/available", response_model=list[AvailableRideListResponse])
async def list_available_rides(
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.list_available_rides(current_driver, db)


@router.get("/rides/current", response_model=CurrentRideResponse | None)
async def get_current_ride(
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.get_current_driver_ride(current_driver, db)


@router.post("/rides/{ride_id}/accept", response_model=DriverRideActionResponse)
async def accept_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.accept_ride(current_driver, ride_id, db)


@router.post("/rides/{ride_id}/decline")
async def decline_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
):
    return await driver_service.decline_ride(current_driver, ride_id)


@router.post("/rides/{ride_id}/start", response_model=DriverRideActionResponse)
async def start_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.start_ride(current_driver, ride_id, db)


@router.post("/rides/{ride_id}/complete", response_model=DriverRideActionResponse)
async def complete_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.complete_ride(current_driver, ride_id, db)


@router.post("/rides/{ride_id}/cancel", response_model=DriverRideActionResponse)
async def cancel_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.cancel_ride(current_driver, ride_id, db)


@router.patch("/location", response_model=DriverLocationResponse)
async def update_location(
    payload: DriverLocationUpdate,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.update_driver_location(
        current_driver,
        payload.latitude,
        payload.longitude,
        db,
    )


@router.get("/status", response_model=DriverStatusResponse)
async def get_driver_status(
    current_driver: Driver = Depends(get_current_driver_profile),
):
    return {"driver_id": current_driver.id, "status": current_driver.status.value}


@router.patch("/status", response_model=DriverStatusResponse)
async def update_status(
    payload: DriverStatusUpdate,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.update_driver_status(current_driver, payload.status, db)


# ─── Carpool Endpoints ─────────────────────────────────────────────────────


@router.post("/carpool/{group_id}/accept")
async def accept_carpool(
    group_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    """Driver accepts a carpool group assignment."""
    from app.services.dispatch import active_dispatches
    from app.models.carpool_group import CarpoolGroup, CarpoolGroupStatusEnum
    from app.models import Ride, RideStatusEnum, DriverStatusEnum
    from app.api.routers.tracking import broadcast_ride_status
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select

    # 1. Fetch group from database
    result = await db.execute(
        select(CarpoolGroup)
        .options(selectinload(CarpoolGroup.rides))
        .where(CarpoolGroup.id == group_id)
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Carpool group not found")

    if group.driverId and group.driverId != current_driver.id:
        raise HTTPException(status_code=409, detail="This carpool has already been accepted by another driver")

    if group.status in (CarpoolGroupStatusEnum.CANCELLED, CarpoolGroupStatusEnum.COMPLETED):
        raise HTTPException(status_code=409, detail=f"Cannot accept carpool in status {group.status.value}")

    # 2. Update memory dispatch state if present
    dispatch_key = f"pool_{group_id}"
    if dispatch_key in active_dispatches:
        active_dispatches[dispatch_key]["status"] = "ACCEPTED"

    # 3. Assign driver to group and all rides
    group.driverId = current_driver.id
    group.status = CarpoolGroupStatusEnum.IN_PROGRESS
    current_driver.status = DriverStatusEnum.ON_RIDE

    for ride in group.rides:
        ride.driverId = current_driver.id
        ride.status = RideStatusEnum.MATCHED
        await broadcast_ride_status(ride.id, "MATCHED", {
            "message": "Driver confirmed for your carpool!",
            "driver_id": current_driver.id,
            "is_carpool": True,
            "group_id": group_id,
        })
    await db.commit()

    return {"message": "Carpool accepted"}


@router.post("/carpool/{group_id}/decline")
async def decline_carpool(
    group_id: int,
    current_driver: Driver = Depends(get_current_driver_profile),
):
    """Driver declines a carpool group assignment."""
    from app.services.dispatch import active_dispatches
    dispatch_key = f"pool_{group_id}"
    state = active_dispatches.get(dispatch_key)

    if state and state.get("driver_id") == current_driver.id:
        active_dispatches[dispatch_key]["status"] = "DECLINED"

    return {"message": "Carpool declined"}

