import httpx
from fastapi import HTTPException
from config.settings import settings  # move keys to env

GRAPHHOPPER_URL = "https://graphhopper.com/api/1/route"
GRAPHHOPPER_API_KEY = "a5a3961b-0395-4cec-82db-48f7e3ade6c5"

BASE_FARE = 2.50
PRICE_PER_KM = 1.20
PRICE_PER_KM_LONG = 0.90
LONG_RIDE_THRESHOLD_KM = 20.0


async def get_route_distance_km(
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> float:
    params = {
        "point": [
            f"{pickup_lat},{pickup_lng}",
            f"{dest_lat},{dest_lng}",
        ],
        "profile": "car",
        "calc_points": "false",
        "key": GRAPHHOPPER_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GRAPHHOPPER_URL, params=params, timeout=10.0)
            response.raise_for_status()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Routing service timed out")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Routing service error: {e.response.status_code}")

    try:
        distance_meters = response.json()["paths"][0]["distance"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from routing service")

    return round(distance_meters / 1000, 3)


def calculate_fare(distance_km: float) -> dict:
    if distance_km <= LONG_RIDE_THRESHOLD_KM:
        fare = BASE_FARE + (distance_km * PRICE_PER_KM)
    else:
        fare = (
            BASE_FARE
            + (LONG_RIDE_THRESHOLD_KM * PRICE_PER_KM)
            + ((distance_km - LONG_RIDE_THRESHOLD_KM) * PRICE_PER_KM_LONG)
        )

    fare = round(fare, 2)
    return {
        "estimated_fare": fare,
        "breakdown": {
            "base_fare": BASE_FARE,
            "distance_charge": round(fare - BASE_FARE, 2),
            "pricing_note": (
                f"${PRICE_PER_KM}/km up to {LONG_RIDE_THRESHOLD_KM}km, "
                f"${PRICE_PER_KM_LONG}/km beyond"
            ),
        },
    }


async def get_distance_and_fare(
    pickup_lat: float, pickup_lng: float,
    dest_lat: float, dest_lng: float,
) -> dict:
    distance_km = await get_route_distance_km(pickup_lat, pickup_lng, dest_lat, dest_lng)
    fare_data = calculate_fare(distance_km)
    return {
        "distance_km": distance_km,
        "currency": "USD",
        **fare_data,
    }