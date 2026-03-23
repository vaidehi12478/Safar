from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class DriverLocation(Base):
    __tablename__ = "driver_location"

    id = Column(Integer, primary_key=True, index=True)
    driverId = Column(Integer, ForeignKey("driver.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, server_default=func.now())

    driver = relationship("Driver", back_populates="locations")
