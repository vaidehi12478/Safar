import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import UserCreate, Token, UserLogin, UserResponse, RefreshRequest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
)
from app.api.deps import get_current_user
from config.database import get_db
from config.settings import settings
from app.models import User, Driver, RoleEnum, RefreshToken

router = APIRouter()


async def issue_token_pair(
    user: User,
    db: AsyncSession,
    response: Response,
    family_id: str | None = None,
    device_info: str | None = None,
    ip_address: str | None = None,
) -> dict:
    """Helper to generate and persist access + rotated refresh tokens."""
    access_token = create_access_token(subject=str(user.id))
    raw_refresh_token = create_refresh_token()
    token_hash = hash_token(raw_refresh_token)

    if not family_id:
        family_id = str(uuid.uuid4())

    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_record = RefreshToken(
        userId=user.id,
        tokenHash=token_hash,
        familyId=family_id,
        isRevoked=False,
        deviceInfo=device_info,
        ipAddress=ip_address,
        expiresAt=expires_at,
    )
    db.add(refresh_record)
    await db.commit()

    # Set secure HttpOnly cookie for web browsers
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=raw_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=Token)
async def register(
    user_data: UserCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    user_exists = result.scalars().first()

    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=RoleEnum[user_data.role],
    )
    db.add(new_user)
    await db.flush()

    # Create driver profile automatically if user registers as DRIVER
    if user_data.role == "DRIVER":
        new_driver = Driver(
            userId=new_user.id,
            vehicleType="Standard",
        )
        db.add(new_driver)

    await db.commit()
    await db.refresh(new_user)

    return await issue_token_pair(
        user=new_user,
        db=db,
        response=response,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
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

    return await issue_token_pair(
        user=user,
        db=db,
        response=response,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/refresh", response_model=Token)
async def refresh_tokens(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange valid refresh token for a new access token and rotated refresh token.
    Supports HttpOnly cookie and JSON body fallback.
    """
    # Prefer explicit body token if provided, fallback to HttpOnly cookie
    raw_token = (body.refresh_token if body and body.refresh_token else None) or request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    t_hash = hash_token(raw_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.tokenHash == t_hash))
    token_record = result.scalars().first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Replay attack detection: if token is already revoked, invalidate entire session family
    if token_record.isRevoked:
        family_id = token_record.familyId
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.familyId == family_id)
            .values(isRevoked=True)
        )
        await db.commit()
        response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path="/api/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. Session terminated.",
        )

    # Check expiration
    if token_record.expiresAt < datetime.utcnow():
        token_record.isRevoked = True
        await db.commit()
        response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path="/api/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user = await db.get(User, token_record.userId)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate: revoke used refresh token, issue next token in same family
    token_record.isRevoked = True
    await db.commit()

    return await issue_token_pair(
        user=user,
        db=db,
        response=response,
        family_id=token_record.familyId,
        device_info=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Revoke refresh token and clear cookie."""
    # Prefer explicit body token if provided, fallback to HttpOnly cookie
    raw_token = (body.refresh_token if body and body.refresh_token else None) or request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)

    if raw_token:
        t_hash = hash_token(raw_token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.tokenHash == t_hash))
        token_record = result.scalars().first()
        if token_record:
            token_record.isRevoked = True
            await db.commit()

    response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path="/api/auth")
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all refresh sessions across all devices for this user."""
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.userId == current_user.id)
        .values(isRevoked=True)
    )
    await db.commit()
    response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, path="/api/auth")
    return {"message": "All sessions terminated"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile"""
    return current_user


@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """Verify token validity"""
    return {"valid": True, "user_id": current_user.id, "role": current_user.role}
