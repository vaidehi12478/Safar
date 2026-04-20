from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Driver, DriverLocation, DriverStatusEnum, Ride, RideStatusEnum
from app.api.routers.tracking import broadcast_ride_status
from app.services.dispatch import active_dispatches


def _raise_transition_error(action: str, current_status):
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Cannot {action} ride from status {current_status}",
    )


async def _get_ride_or_404(db: AsyncSession, ride_id: int):
    result = await db.execute(
        select(Ride)
        .options(
            selectinload(Ride.driver),
            selectinload(Ride.pickup_location),
            selectinload(Ride.destination_location),
        )
        .where(Ride.id == ride_id)
    )
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")
    return ride


async def _ensure_driver_has_no_active_ride(db: AsyncSession, driver_id: int):
    result = await db.execute(
        select(Ride).where(
            Ride.driverId == driver_id,
            Ride.status.in_([RideStatusEnum.MATCHED, RideStatusEnum.IN_PROGRESS]),
        )
    )
    active = result.scalars().first()
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver already has an active ride",
        )


def _ensure_assigned_driver(ride: Ride, driver: Driver):
    if ride.driverId != driver.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ride is not assigned to this driver",
        )


async def list_available_rides(driver: Driver, db: AsyncSession):
    if driver.isSuspended:
        return []
    result = await db.execute(
        select(Ride)
        .options(selectinload(Ride.pickup_location), selectinload(Ride.destination_location))
        .where(Ride.status == RideStatusEnum.REQUESTED)
        .order_by(Ride.createdAt.desc())
    )
    all_requested_rides = result.scalars().all()
    
    # Filter to only return the ride currently dispatched to THIS driver
    dispatched_rides = []
    for ride in all_requested_rides:
        state = active_dispatches.get(ride.id)
        if state and state.get("driver_id") == driver.id and state.get("status") == "PENDING":
            dispatched_rides.append(ride)
            
    return dispatched_rides


async def get_current_driver_ride(driver: Driver, db: AsyncSession):
    result = await db.execute(
        select(Ride)
        .options(
            selectinload(Ride.pickup_location), 
            selectinload(Ride.destination_location),
            selectinload(Ride.driver).joinedload(Driver.user)
        )
        .where(
            Ride.driverId == driver.id,
            Ride.status.in_([RideStatusEnum.MATCHED, RideStatusEnum.IN_PROGRESS]),
        )
        .order_by(Ride.createdAt.desc())
    )
    return result.scalars().first()


async def accept_ride(driver: Driver, ride_id: int, db: AsyncSession):
    if driver.isSuspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your driver account is suspended. Please contact support."
        )
    await _ensure_driver_has_no_active_ride(db, driver.id)
    ride = await _get_ride_or_404(db, ride_id)
    if ride.status != RideStatusEnum.REQUESTED:
        _raise_transition_error("accept", ride.status)

    ride.driverId = driver.id
    ride.status = RideStatusEnum.MATCHED
    await db.commit()
    await db.refresh(ride)

    # Mark as accepted in dispatch loop
    state = active_dispatches.get(ride_id)
    if state and state.get("driver_id") == driver.id:
        active_dispatches[ride_id]["status"] = "ACCEPTED"

    # Notify rider via WebSocket
    await broadcast_ride_status(ride_id, "MATCHED", {"message": "A driver has accepted your ride!"})

    return ride


async def decline_ride(driver: Driver, ride_id: int):
    # Just update the in-memory dispatch state so the loop skips to the next driver immediately
    state = active_dispatches.get(ride_id)
    if state and state.get("driver_id") == driver.id:
        active_dispatches[ride_id]["status"] = "DECLINED"
    return {"message": "Ride declined"}


async def start_ride(driver: Driver, ride_id: int, db: AsyncSession):
    ride = await _get_ride_or_404(db, ride_id)
    _ensure_assigned_driver(ride, driver)
    if ride.status != RideStatusEnum.MATCHED:
        _raise_transition_error("start", ride.status)

    ride.status = RideStatusEnum.IN_PROGRESS
    driver.status = DriverStatusEnum.ON_RIDE
    await db.commit()
    await db.refresh(ride)

    # Notify rider via WebSocket
    await broadcast_ride_status(ride_id, "IN_PROGRESS", {"message": "Your ride has started! Driver is on the way."})

    return ride


async def complete_ride(driver: Driver, ride_id: int, db: AsyncSession):
    ride = await _get_ride_or_404(db, ride_id)
    _ensure_assigned_driver(ride, driver)
    if ride.status != RideStatusEnum.IN_PROGRESS:
        _raise_transition_error("complete", ride.status)

    ride.status = RideStatusEnum.COMPLETED
    driver.status = DriverStatusEnum.ONLINE
    
    # Driver Earnings (80% of total price)
    if ride.price:
        earnings = round(ride.price * 0.80, 2)
        driver.totalEarnings = (driver.totalEarnings or 0) + earnings
        driver.walletBalance = (driver.walletBalance or 0) + earnings

    await db.commit()
    await db.refresh(ride)

    # Notify rider via WebSocket
    await broadcast_ride_status(ride_id, "COMPLETED", {"message": f"Ride completed! Fare: ${ride.price:.2f}" if ride.price else "Ride completed!"})

    return ride


async def cancel_ride(driver: Driver, ride_id: int, db: AsyncSession):
    ride = await _get_ride_or_404(db, ride_id)
    _ensure_assigned_driver(ride, driver)
    if ride.status not in (
        RideStatusEnum.REQUESTED,
        RideStatusEnum.MATCHED,
        RideStatusEnum.IN_PROGRESS,
    ):
        _raise_transition_error("cancel", ride.status)

    ride.status = RideStatusEnum.CANCELLED
    driver.status = DriverStatusEnum.ONLINE
    await db.commit()
    await db.refresh(ride)

    # Notify rider via WebSocket
    await broadcast_ride_status(ride_id, "CANCELLED", {"message": "Your ride has been cancelled by the driver."})

    return ride


async def update_driver_location(driver: Driver, latitude: float, longitude: float, db: AsyncSession):
    location = DriverLocation(driverId=driver.id, latitude=latitude, longitude=longitude)
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


async def update_driver_status(driver: Driver, new_status: str, db: AsyncSession):
    status_value = new_status.upper()
    if status_value not in DriverStatusEnum._value2member_map_:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid driver status")

    if status_value == DriverStatusEnum.ON_RIDE.value:
        active_ride = await get_current_driver_ride(driver, db)
        if not active_ride:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Driver cannot be ON_RIDE without active ride",
            )
    elif status_value == DriverStatusEnum.OFFLINE.value:
        active_ride = await get_current_driver_ride(driver, db)
        if active_ride:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Driver cannot go OFFLINE during active ride",
            )

    driver.status = DriverStatusEnum(status_value)
    await db.commit()
    await db.refresh(driver)
    return driver
