from pydantic import BaseModel
from typing import Optional
from app.schemas.ride import RideListResponse, RideDetailResponse


class DriverRideActionResponse(BaseModel):
    id: int
    status: str
    driverId: Optional[int] = None

    class Config:
        from_attributes = True


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class DriverStatusUpdate(BaseModel):
    status: str


class DriverLocationResponse(BaseModel):
    driverId: int
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


class DriverStatusResponse(BaseModel):
    id: int
    status: str

    class Config:
        from_attributes = True


class AvailableRideListResponse(RideListResponse):
    pass


class CurrentRideResponse(RideDetailResponse):
    pass
