import httpx
import math
from fastapi import HTTPException
from config.settings import settings  # move keys to env

GRAPHHOPPER_URL = "https://graphhopper.com/api/1/route"
GRAPHHOPPER_API_KEY = "a5a3961b-0395-4cec-82db-48f7e3ade6c5"

BASE_FARE = 50.00
PRICE_PER_KM = 14.00
PRICE_PER_KM_LONG = 11.00
LONG_RIDE_THRESHOLD_KM = 20.0
CARPOOL_MULTIPLIER = 0.70  # 30% group discount applied to total route cost


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
                f"₹{PRICE_PER_KM}/km up to {LONG_RIDE_THRESHOLD_KM}km, "
                f"₹{PRICE_PER_KM_LONG}/km beyond"
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
        "currency": "INR",
        **fare_data,
    }


async def get_route_path(
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> list[list[float]]:
    """
    Fetch the full driving route geometry from GraphHopper.
    Returns a list of [latitude, longitude] coordinate pairs.
    """
    params = {
        "point": [
            f"{pickup_lat},{pickup_lng}",
            f"{dest_lat},{dest_lng}",
        ],
        "profile": "car",
        "calc_points": "true",
        "points_encoded": "false",
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
        # GraphHopper returns coordinates as [lng, lat], we need [lat, lng] for Leaflet
        coordinates = response.json()["paths"][0]["points"]["coordinates"]
        return [[coord[1], coord[0]] for coord in coordinates]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from routing service")


# ─── Carpool Fare Calculation ───────────────────────────────────────────────


def calculate_carpool_fare(
    rider_distance_km: float,
    total_route_distance_km: float,
    num_passengers: int,
) -> dict:
    """
    Proportional fare per rider based on how far they travel
    within the combined carpool route.

    Formula:
        total_fare  = full fare for the entire carpool route
        rider_share = rider_distance / total_route_distance
        rider_fare  = total_fare * rider_share * CARPOOL_MULTIPLIER
    """
    total_fare_data = calculate_fare(total_route_distance_km)
    total_fare      = total_fare_data["estimated_fare"]
    rider_share     = rider_distance_km / max(total_route_distance_km, 0.001)
    rider_fare      = round(total_fare * rider_share * CARPOOL_MULTIPLIER, 2)
    solo_fare       = calculate_fare(rider_distance_km)["estimated_fare"]

    return {
        "rider_fare":     rider_fare,
        "solo_fare":      solo_fare,
        "savings":        round(solo_fare - rider_fare, 2),
        "discount_pct":   int((1 - CARPOOL_MULTIPLIER) * 100),
        "num_passengers": num_passengers,
        "currency":       "INR",
    }


def estimate_carpool_fare_simple(distance_km: float, assumed_passengers: int = 2) -> dict:
    """
    Quick estimate shown to rider BEFORE booking (before group forms).
    Uses assumed_passengers as a rough estimate.
    """
    solo_fare    = calculate_fare(distance_km)["estimated_fare"]
    carpool_fare = round((solo_fare * CARPOOL_MULTIPLIER) / assumed_passengers, 2)
    return {
        "solo_fare":              solo_fare,
        "estimated_carpool_fare": carpool_fare,
        "assumed_passengers":     assumed_passengers,
        "savings":                round(solo_fare - carpool_fare, 2),
        "discount_pct":           int((1 - CARPOOL_MULTIPLIER) * 100),
        "currency":               "INR",
    }


# ─── Multi-Stop Routing (for Carpool) ──────────────────────────────────────


async def get_multi_stop_route(
    waypoints: list[tuple[float, float]],
) -> dict:
    """
    Fetch the full driving route for multiple stops via GraphHopper.
    waypoints = [(lat, lng), (lat, lng), ...]
    Returns total_distance_km, total_time_min, and full path geometry.
    """
    params = {
        "point":          [f"{lat},{lng}" for lat, lng in waypoints],
        "profile":        "car",
        "calc_points":    "true",
        "points_encoded": "false",
        "key":            GRAPHHOPPER_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GRAPHHOPPER_URL, params=params, timeout=15.0)
            response.raise_for_status()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Routing service timed out")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Routing service error: {e.response.status_code}")

    try:
        path          = response.json()["paths"][0]
        total_dist_km = round(path["distance"] / 1000, 3)
        total_time_min = round(path["time"] / 60000, 1)
        coordinates   = path["points"]["coordinates"]
        geometry      = [[c[1], c[0]] for c in coordinates]  # lng,lat → lat,lng
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected response from routing service")

    return {
        "total_distance_km": total_dist_km,
        "total_time_min":    total_time_min,
        "path":              geometry,
    }


def build_optimal_waypoint_order(
    riders: list[dict],
) -> list[tuple[float, float]]:
    """
    Strategy: pick up all riders first (nearest to group center first),
    then drop off in order of distance from center (nearest dest first).

    riders = [{"pickup": (lat,lng), "destination": (lat,lng), "ride_id": int}, ...]
    Returns ordered list of (lat, lng) waypoints: [P1, P2, D1, D2]
    """
    if not riders:
        return []

    center_lat = sum(r["pickup"][0] for r in riders) / len(riders)
    center_lng = sum(r["pickup"][1] for r in riders) / len(riders)

    def dist_from_center(point):
        return math.sqrt((point[0] - center_lat) ** 2 + (point[1] - center_lng) ** 2)

    # Sort pickups: nearest to center first
    sorted_pickups = sorted(riders, key=lambda r: dist_from_center(r["pickup"]))
    # Sort destinations: nearest to center first (drops off closest dest first)
    sorted_dropoffs = sorted(riders, key=lambda r: dist_from_center(r["destination"]))

    waypoints = (
        [r["pickup"] for r in sorted_pickups]
        + [r["destination"] for r in sorted_dropoffs]
    )
    return waypoints