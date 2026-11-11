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


class RideTypeEnum(str, enum.Enum):
    SOLO = "SOLO"
    CARPOOL = "CARPOOL"


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

    # Carpool fields
    rideType = Column(Enum(RideTypeEnum), default=RideTypeEnum.SOLO, nullable=False)
    carpoolGroupId = Column(Integer, ForeignKey("carpool_group.id"), nullable=True)
    riderDistanceKm = Column(Float, nullable=True)  # Per-rider distance in combined route

    # Payment fields
    paymentMethod = Column("payment_method", String(30), default="RAZORPAY", nullable=True)
    paymentStatus = Column("payment_status", String(30), default="PENDING", nullable=True)
    razorpayOrderId = Column("razorpay_order_id", String(100), nullable=True)
    razorpayPaymentId = Column("razorpay_payment_id", String(100), nullable=True)
    razorpaySignature = Column("razorpay_signature", String(255), nullable=True)
    paidAt = Column("paid_at", DateTime(timezone=True), nullable=True)

    rider = relationship("User", back_populates="rides", foreign_keys=[riderId])
    driver = relationship("Driver", back_populates="rides", foreign_keys=[driverId])
    pickup_location = relationship("Location", back_populates="rides_as_pickup", foreign_keys=[pickupLocationId])
    destination_location = relationship("Location", back_populates="rides_as_destination", foreign_keys=[destinationLocationId])
    carpool_group = relationship("CarpoolGroup", back_populates="rides")
