from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_current_user
from config.database import get_db
from app.models import User, Ride, RideStatusEnum, Driver
from app.schemas.auth import UserResponse

router = APIRouter()

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class UserStats(BaseModel):
    total_rides: int
    total_distance_km: float
    total_spent: float
    total_earned: float
    wallet_balance: float = 0.0
    rating: float = 5.0
    num_ratings: int = 0
    is_suspended: bool = False

@router.patch("/me", response_model=UserResponse)
async def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.name:
        current_user.name = payload.name
    if payload.email and payload.email != current_user.email:
        # Check uniqueness
        result = await db.execute(select(User).where(User.email == payload.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = payload.email
        
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("/me/stats", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stats = {
        "total_rides": 0, 
        "total_distance_km": 0.0, 
        "total_spent": 0.0, 
        "total_earned": 0.0, 
        "wallet_balance": 0.0,
        "rating": current_user.rating or 5.0,
        "num_ratings": current_user.numRatings or 0,
        "is_suspended": False
    }
    
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    # Calculate stats for RIDER
    if role in ["RIDER", "ADMIN"]:
        query = select(
            func.count(Ride.id),
            func.sum(Ride.distanceKm),
            func.sum(Ride.price)
        ).where(Ride.riderId == current_user.id, Ride.status == RideStatusEnum.COMPLETED)
        result = await db.execute(query)
        row = result.first()
        if row:
            stats["total_rides"] += row[0] or 0
            stats["total_distance_km"] += row[1] or 0.0
            stats["total_spent"] += row[2] or 0.0
            
    # Calculate stats for DRIVER
    if role in ["DRIVER", "ADMIN"]:
        d_result = await db.execute(select(Driver).where(Driver.userId == current_user.id))
        driver = d_result.scalars().first()
        if driver:
            query = select(
                func.count(Ride.id),
                func.sum(Ride.distanceKm)
            ).where(Ride.driverId == driver.id, Ride.status == RideStatusEnum.COMPLETED)
            result = await db.execute(query)
            row = result.first()
            if row:
                if role == "DRIVER":
                    # For strict drivers, overwrite the zeros. For admins, maybe just add.
                    stats["total_rides"] = row[0] or 0
                    stats["total_distance_km"] = row[1] or 0.0
                
            stats["total_earned"] += driver.totalEarnings or 0.0
            stats["wallet_balance"] += driver.walletBalance or 0.0
            stats["rating"] = driver.rating or 5.0
            stats["num_ratings"] = driver.numRatings or 0
            stats["is_suspended"] = bool(driver.isSuspended)

    return UserStats(**stats)
