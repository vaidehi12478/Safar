from sqlalchemy import Column, Integer, Float, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class RideStatusEnum(str, enum.Enum):
    REQUESTED = "REQUESTED"
    MATCHED = "MATCHED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Ride(Base):
    __tablename__ = "ride"

    id = Column(Integer, primary_key=True, index=True)
    riderId = Column(Integer, ForeignKey("user.id"), nullable=False)
    driverId = Column(Integer, ForeignKey("driver.id"), nullable=True)
    pickupLocationId = Column(Integer, ForeignKey("location.id"), nullable=False)
    destinationLocationId = Column(Integer, ForeignKey("location.id"), nullable=False)
    price = Column(Float, nullable=True)
    distanceKm = Column(Float, nullable=True)
    status = Column(Enum(RideStatusEnum), default=RideStatusEnum.REQUESTED)
    createdAt = Column(DateTime, server_default=func.now())

    rider = relationship("User", back_populates="rides", foreign_keys=[riderId])
    driver = relationship("Driver", back_populates="rides", foreign_keys=[driverId])
    pickup_location = relationship("Location", back_populates="rides_as_pickup", foreign_keys=[pickupLocationId])
    destination_location = relationship("Location", back_populates="rides_as_destination", foreign_keys=[destinationLocationId])
