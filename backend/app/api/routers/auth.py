from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import UserCreate, Token, UserLogin, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user
from config.database import get_db
from config.settings import settings
from app.models import User, Driver, RoleEnum

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    user_exists = result.scalars().first()
    
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=RoleEnum[user_data.role]
    )
    db.add(new_user)
    await db.flush()  # Flush to get the ID without committing
    
    # Create driver profile automatically if user registers as DRIVER
    if user_data.role == "DRIVER":
        new_driver = Driver(
            userId=new_user.id,
            vehicleType="Standard"  # default
        )
        db.add(new_driver)
    
    await db.commit()
    await db.refresh(new_user)

    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(new_user.id), expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    # Find user by email
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    is_valid = verify_password(user_data.password, user.password)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile"""
    return current_user


@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """Verify token validity"""
    return {"valid": True, "user_id": current_user.id, "role": current_user.role}
