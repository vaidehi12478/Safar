from fastapi import APIRouter, Depends, HTTPException, status
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import get_current_user, require_roles
from config.database import get_db
from app.schemas.ride import (
    RideRequest, RideResponse, RideListResponse, 
    RideDetailResponse, RideStatusResponse,
    RideEstimateRequest, RideEstimateResponse
)
from app.services import ride as ride_service
from app.services.routing import get_route_path, get_distance_and_fare
from app.services.geocoding import search_location
from app.models import Ride, User, Driver
from app.schemas.review import ReviewCreate, ReviewResponse
from app.services import review as review_service

router = APIRouter()

@router.post("/{ride_id}/review", response_model=ReviewResponse)
async def submit_review(
    ride_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a review for a completed ride."""
    return await review_service.create_review(
        ride_id=ride_id,
        reviewer=current_user,
        rating=payload.rating,
        comment=payload.comment,
        db=db
    )

@router.post("/estimate", response_model=RideEstimateResponse)
async def estimate_fare(
    request: RideRequest,
    current_user: User = Depends(require_roles("RIDER", "ADMIN")),
):
    """Estimate fare before requesting a ride"""
    try:
        pickup_data, destination_data = await asyncio.gather(
            search_location(request.pickup_query),
            search_location(request.destination_query),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    fare_data = await get_distance_and_fare(
        pickup_data["latitude"],
        pickup_data["longitude"],
        destination_data["latitude"],
        destination_data["longitude"],
    )
    return fare_data


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
    query = select(Ride).options(
        joinedload(Ride.pickup_location),
        joinedload(Ride.destination_location)
    ).order_by(Ride.createdAt.desc())
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
            joinedload(Ride.driver).joinedload(Driver.user),
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


@router.get("/{ride_id}/route")
async def get_ride_route(
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the driving route path (array of [lat, lng]) for a ride."""
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

    if not ride.pickup_location or not ride.destination_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ride locations not set"
        )

    path = await get_route_path(
        ride.pickup_location.latitude,
        ride.pickup_location.longitude,
        ride.destination_location.latitude,
        ride.destination_location.longitude,
    )

    return {"ride_id": ride_id, "path": path}


@router.get("/admin/all-rides", response_model=list[RideListResponse])
async def get_all_rides_admin(
    current_user: User = Depends(require_roles("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Get all rides in system - admin only"""
    result = await db.execute(
        select(Ride)
        .options(
            joinedload(Ride.pickup_location),
            joinedload(Ride.destination_location)
        )
        .order_by(Ride.createdAt.desc())
    )
    rides = result.scalars().all()
    return rides


@router.post("/{ride_id}/cancel", response_model=RideDetailResponse)
async def cancel_ride(
    ride_id: int,
    current_user: User = Depends(require_roles("RIDER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a ride requested by the rider"""
    return await ride_service.cancel_ride_by_rider(ride_id, current_user.id, db)
