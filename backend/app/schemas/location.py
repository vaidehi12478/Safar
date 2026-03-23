from pydantic import BaseModel, Field
from typing import Optional

class LocationResponse(BaseModel):
    id: int
    display_name: str = Field(alias="displayName")
    latitude: float
    longitude: float
    name: Optional[str] = None
    road: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = Field(None, alias="countryCode")

    class Config:
        from_attributes = True
        populate_by_name = True