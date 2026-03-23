from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class DriverStatusEnum(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    ON_RIDE = "ON_RIDE"


class Driver(Base):
    __tablename__ = "driver"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("user.id"), unique=True, nullable=False)
    vehicleType = Column(String, nullable=False)
    rating = Column(Float, default=5.0)
    status = Column(Enum(DriverStatusEnum), default=DriverStatusEnum.OFFLINE)
    createdAt = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="driver_profile")
    rides = relationship("Ride", back_populates="driver", foreign_keys="Ride.driverId", cascade="all, delete-orphan")
    locations = relationship("DriverLocation", back_populates="driver", cascade="all, delete-orphan")
