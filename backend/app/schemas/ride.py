from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.location import LocationResponse

class RideRequest(BaseModel):
    pickup_query: str
    destination_query: str

class RideEstimateResponse(BaseModel):
    distance_km: float
    estimated_fare: float
    currency: str = "USD"
    breakdown: dict

class DriverBasicResponse(BaseModel):
    id: int
    name: str
    email: str
    vehicleType: str = Field(alias="vehicle_type")

    class Config:
        from_attributes = True
        populate_by_name = True

class RideResponse(BaseModel):
    id: int
    status: str
    price: Optional[float]
    distanceKm: Optional[float] = Field(None, alias="distance_km")
    pickupLocation: LocationResponse = Field(alias="pickup_location")
    destinationLocation: LocationResponse = Field(alias="destination_location")
    estimate: Optional[RideEstimateResponse] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class RideListResponse(BaseModel):
    id: int
    status: str
    price: Optional[float]
    distanceKm: Optional[float] = Field(None, alias="distance_km")
    createdAt: datetime = Field(alias="created_at")
    pickupLocation: LocationResponse = Field(alias="pickup_location")
    destinationLocation: LocationResponse = Field(alias="destination_location")

    class Config:
        from_attributes = True
        populate_by_name = True

class RideDetailResponse(BaseModel):
    id: int
    status: str
    price: Optional[float] = None
    distanceKm: Optional[float] = None
    createdAt: datetime
    riderId: int
    driverId: Optional[int] = None
    pickupLocation: LocationResponse
    destinationLocation: LocationResponse
    # driver: Optional[DriverBasicResponse] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class RideStatusResponse(BaseModel):
    id: int
    status: str
    createdAt: datetime = Field(alias="created_at")

    class Config:
        from_attributes = True
        populate_by_name = True