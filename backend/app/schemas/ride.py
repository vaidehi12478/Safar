from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum as PyEnum
from app.schemas.location import LocationResponse


class RideTypeEnum(str, PyEnum):
    SOLO = "SOLO"
    CARPOOL = "CARPOOL"


class RideRequest(BaseModel):
    pickup_query: str
    destination_query: str
    ride_type: RideTypeEnum = RideTypeEnum.SOLO

class RideEstimateRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dest_lat: float
    dest_lng: float

class RideEstimateResponse(BaseModel):
    distance_km: float
    estimated_fare: float
    currency: str = "INR"
    breakdown: dict
    pickup_coords: Optional[list[float]] = None
    destination_coords: Optional[list[float]] = None
    pickup_display_name: Optional[str] = None
    destination_display_name: Optional[str] = None
    route_path: Optional[list[list[float]]] = None

class DriverBasicResponse(BaseModel):
    id: int
    name: str
    email: str
    vehicleType: str = Field(alias="vehicle_type")
    rating: float = 5.0
    numRatings: int = Field(0, alias="num_ratings")

    class Config:
        from_attributes = True
        populate_by_name = True

class RideResponse(BaseModel):
    id: int
    status: str
    price: Optional[float]
    distanceKm: Optional[float] = Field(None, alias="distance_km")
    rideType: str = Field("SOLO", alias="ride_type")
    carpoolGroupId: Optional[int] = Field(None, alias="carpool_group_id")
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
    rideType: str = Field("SOLO", alias="ride_type")
    carpoolGroupId: Optional[int] = Field(None, alias="carpool_group_id")
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
    rideType: str = "SOLO"
    carpoolGroupId: Optional[int] = None
    createdAt: datetime
    riderId: int
    driverId: Optional[int] = None
    pickupLocation: LocationResponse = Field(alias="pickup_location")
    destinationLocation: LocationResponse = Field(alias="destination_location")
    driver: Optional[DriverBasicResponse] = None
    paymentMethod: Optional[str] = Field(None, alias="payment_method")
    paymentStatus: Optional[str] = Field("PENDING", alias="payment_status")
    razorpayOrderId: Optional[str] = Field(None, alias="razorpay_order_id")
    razorpayPaymentId: Optional[str] = Field(None, alias="razorpay_payment_id")
    paidAt: Optional[datetime] = Field(None, alias="paid_at")

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