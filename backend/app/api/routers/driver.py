from fastapi import APIRouter, Depends
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
    _: User = Depends(require_roles("DRIVER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.list_available_rides(db)


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


@router.patch("/status", response_model=DriverStatusResponse)
async def update_status(
    payload: DriverStatusUpdate,
    current_driver: Driver = Depends(get_current_driver_profile),
    db: AsyncSession = Depends(get_db),
):
    return await driver_service.update_driver_status(current_driver, payload.status, db)
