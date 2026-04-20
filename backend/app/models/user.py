from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.db.base import Base


class RoleEnum(str, enum.Enum):
    RIDER = "RIDER"
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.RIDER, nullable=False)
    rating = Column(Float, default=5.0)
    numRatings = Column(Integer, default=0)
    createdAt = Column(DateTime, server_default=func.now())

    driver_profile = relationship("Driver", back_populates="user", uselist=False, cascade="all, delete-orphan")
    rides = relationship("Ride", back_populates="rider", foreign_keys="Ride.riderId", cascade="all, delete-orphan")
