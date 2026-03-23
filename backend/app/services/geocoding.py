import httpx
from typing import Optional
from app.schemas.location import LocationResponse

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "UberCloneApp/1.0"}  # Nominatim requires a User-Agent

async def search_location(query: str) -> dict:
    """Convert name/address → coordinates (forward geocoding)"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NOMINATIM_BASE}/search",
            params={
                "q": query,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": 1,
            },
            headers=HEADERS,
        )
        response.raise_for_status()
        results = response.json()

    if not results:
        raise ValueError(f"No location found for query: '{query}'")

    return _parse_geocode_response(results[0])


async def reverse_location(lat: float, lon: float) -> dict:
    """Convert coordinates → name/address (reverse geocoding)"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NOMINATIM_BASE}/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "jsonv2",
                "layer": "address",
            },
            headers=HEADERS,
        )
        response.raise_for_status()
        result = response.json()

    return _parse_geocode_response(result)


def _parse_geocode_response(data: dict) -> dict:
    """Extract only the fields we care about from the API response"""
    address = data.get("address", {})
    return {
        "place_id":    data.get("place_id"),
        "display_name": data["display_name"],
        "latitude":    float(data["lat"]),
        "longitude":   float(data["lon"]),
        "name":        data.get("name"),
        "road":        address.get("road"),
        "city":        address.get("city") or address.get("town") or address.get("village"),
        "postcode":    address.get("postcode"),
        "country":     address.get("country"),
        "country_code": address.get("country_code"),
    }