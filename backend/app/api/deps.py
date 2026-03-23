from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from config.settings import settings
from app.schemas.auth import TokenData
from config.database import get_db
from app.models import User, Driver

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        token_data = TokenData(id=int(user_id))
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(select(User).where(User.id == token_data.id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


def _role_value(role):
    return role.value if hasattr(role, "value") else str(role)


def require_roles(*allowed_roles: str):
    normalized_allowed = {role.upper() for role in allowed_roles}

    async def role_dependency(current_user: User = Depends(get_current_user)):
        user_role = _role_value(current_user.role).upper()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(sorted(normalized_allowed))}",
            )
        return current_user

    return role_dependency


async def get_current_driver_profile(
    current_user: User = Depends(require_roles("DRIVER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.userId == current_user.id))
    driver_profile = result.scalars().first()
    if not driver_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found",
        )
    return driver_profile
