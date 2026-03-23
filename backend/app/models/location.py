from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Location(Base):
    __tablename__ = "location"

    id = Column(Integer, primary_key=True, index=True)
    placeId = Column(String, unique=True, nullable=True)
    displayName = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    name = Column(String, nullable=True)
    road = Column(String, nullable=True)
    city = Column(String, nullable=True)
    postcode = Column(String, nullable=True)
    country = Column(String, nullable=True)
    countryCode = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())

    rides_as_pickup = relationship("Ride", back_populates="pickup_location", foreign_keys="Ride.pickupLocationId")
    rides_as_destination = relationship("Ride", back_populates="destination_location", foreign_keys="Ride.destinationLocationId")
