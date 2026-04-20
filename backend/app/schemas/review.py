from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    rideId: int
    reviewerId: int
    rating: int
    comment: Optional[str]
    createdAt: datetime

    class Config:
        from_attributes = True
