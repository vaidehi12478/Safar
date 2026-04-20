from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Review(Base):
    __tablename__ = "review"

    id = Column(Integer, primary_key=True, index=True)
    rideId = Column(Integer, ForeignKey("ride.id"), nullable=False)
    reviewerId = Column(Integer, ForeignKey("user.id"), nullable=False)
    revieweeId = Column(Integer, ForeignKey("user.id"), nullable=True) # Can be rider or driver
    revieweeDriverId = Column(Integer, ForeignKey("driver.id"), nullable=True) # Direct ref to driver if applicable
    
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())

    ride = relationship("Ride")
    reviewer = relationship("User", foreign_keys=[reviewerId])
    reviewee_user = relationship("User", foreign_keys=[revieweeId])
    reviewee_driver = relationship("Driver", foreign_keys=[revieweeDriverId])
