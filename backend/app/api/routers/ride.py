from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user, require_roles
from config.database import get_db
from app.schemas.ride import (
    RideRequest, RideResponse, RideListResponse, 
    RideDetailResponse, RideStatusResponse
)
from app.services import ride as ride_service
from app.models import Ride, User

router = APIRouter()

@router.post("/request", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def request_ride(
    ride_request: RideRequest,
    current_user: User = Depends(require_roles("RIDER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await ride_service.create_ride(ride_request, user_id=current_user.id, db=db)


@router.get("/", response_model=list[RideListResponse])
async def get_rider_rides(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all rides for current user."""
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(Ride).order_by(Ride.createdAt.desc())
    if role == "RIDER":
        query = query.where(Ride.riderId == current_user.id)
    elif role == "DRIVER":
        query = query.where(Ride.driver.has(userId=current_user.id))
    result = await db.execute(query)
    rides = result.scalars().all()
    return rides


@router.get("/{ride_id}", response_model=RideDetailResponse)
async def get_ride_detail(
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detail of a specific ride - rider/driver/admin only"""
    result = await db.execute(
        select(Ride)
        .options(
            joinedload(Ride.pickup_location),
            joinedload(Ride.destination_location),
            joinedload(Ride.driver),
        )
        .where(Ride.id == ride_id)
    )
    ride = result.scalars().first()

    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )

    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    is_authorized = (
        role == "ADMIN"
        or ride.riderId == current_user.id
        or (ride.driver is not None and ride.driver.userId == current_user.id)
    )

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this ride"
        )

    return ride


@router.get("/{ride_id}/status", response_model=RideStatusResponse)
async def get_ride_status(
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get just the status field for polling - rider/driver/admin only"""
    result = await db.execute(
        select(Ride)
        .options(joinedload(Ride.driver))
        .where(Ride.id == ride_id)
    )
    ride = result.scalars().first()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )
    
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    is_authorized = (
        role == "ADMIN"
        or ride.riderId == current_user.id
        or (ride.driver is not None and ride.driver.userId == current_user.id)
    )
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this ride"
        )
    
    return ride


@router.get("/admin/all-rides", response_model=list[RideListResponse])
async def get_all_rides_admin(
    current_user: User = Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Get all rides in system - admin only"""
    result = await db.execute(
        select(Ride).order_by(Ride.createdAt.desc())
    )
    rides = result.scalars().all()
    return rides
