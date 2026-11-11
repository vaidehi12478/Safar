from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CarpoolGroupResponse(BaseModel):
    id: int
    status: str
    maxSeats: int
    rider_count: int
    expires_at: Optional[datetime]
    waypoint_order: Optional[str] = None

    class Config:
        from_attributes = True


class CarpoolEstimateResponse(BaseModel):
    solo_fare: float
    estimated_carpool_fare: float
    assumed_passengers: int
    savings: float
    discount_pct: int
    currency: str = "INR"
