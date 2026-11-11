import httpx
import math
from typing import Optional, List
from app.schemas.location import LocationResponse

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "SafarTransitApp/2.0 (contact@safar.app)"}

# Curated popular transit and civic hubs across major Indian metros
POPULAR_TRANSIT_HUBS = [
    # --- Delhi NCR ---
    {
        "place_id": 10001,
        "name": "Indira Gandhi International Airport (DEL)",
        "display_name": "Indira Gandhi International Airport, Terminal 3, New Delhi, Delhi",
        "latitude": 28.5562,
        "longitude": 77.1000,
        "category": "airport",
        "city": "Delhi NCR",
    },
    {
        "place_id": 10002,
        "name": "New Delhi Railway Station (NDLS)",
        "display_name": "New Delhi Railway Station, Bhavbhuti Marg, Paharganj, New Delhi, Delhi",
        "latitude": 28.6430,
        "longitude": 77.2194,
        "category": "railway",
        "city": "Delhi NCR",
    },
    {
        "place_id": 10003,
        "name": "Connaught Place (Rajiv Chowk)",
        "display_name": "Connaught Place, Inner Circle, New Delhi, Delhi",
        "latitude": 28.6328,
        "longitude": 77.2197,
        "category": "landmark",
        "city": "Delhi NCR",
    },
    {
        "place_id": 10004,
        "name": "DLF CyberHub Gurugram",
        "display_name": "DLF CyberHub, DLF Phase 2, Sector 24, Gurugram, Haryana",
        "latitude": 28.4950,
        "longitude": 77.0895,
        "category": "mall",
        "city": "Delhi NCR",
    },
    {
        "place_id": 10005,
        "name": "Kashmere Gate ISBT",
        "display_name": "Maharana Pratap Inter State Bus Terminus, Kashmere Gate, New Delhi, Delhi",
        "latitude": 28.6675,
        "longitude": 77.2285,
        "category": "bus",
        "city": "Delhi NCR",
    },

    # --- Mumbai & MMR ---
    {
        "place_id": 10010,
        "name": "Chhatrapati Shivaji Maharaj Airport (BOM)",
        "display_name": "Chhatrapati Shivaji Maharaj International Airport (T2), Sahar Road, Andheri East, Mumbai, Maharashtra",
        "latitude": 19.0896,
        "longitude": 72.8656,
        "category": "airport",
        "city": "Mumbai",
    },
    {
        "place_id": 10011,
        "name": "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
        "display_name": "CSMT Railway Station, Fort, Mumbai, Maharashtra",
        "latitude": 18.9401,
        "longitude": 72.8353,
        "category": "railway",
        "city": "Mumbai",
    },
    {
        "place_id": 10012,
        "name": "Bandra Kurla Complex (BKC)",
        "display_name": "Bandra Kurla Complex, G Block, Bandra East, Mumbai, Maharashtra",
        "latitude": 19.0664,
        "longitude": 72.8680,
        "category": "mall",
        "city": "Mumbai",
    },
    {
        "place_id": 10013,
        "name": "Gateway of India & Colaba",
        "display_name": "Gateway of India, Apollo Bandar, Colaba, Mumbai, Maharashtra",
        "latitude": 18.9220,
        "longitude": 72.8347,
        "category": "landmark",
        "city": "Mumbai",
    },

    # --- Bengaluru ---
    {
        "place_id": 10020,
        "name": "Kempegowda International Airport (BLR)",
        "display_name": "Kempegowda International Airport Bengaluru, Devanahalli, Bengaluru, Karnataka",
        "latitude": 13.1986,
        "longitude": 77.7066,
        "category": "airport",
        "city": "Bengaluru",
    },
    {
        "place_id": 10021,
        "name": "KSR Bengaluru City Railway Station (Majestic)",
        "display_name": "KSR Bengaluru Station, Kempegowda Bus Station, Majestic, Bengaluru, Karnataka",
        "latitude": 12.9781,
        "longitude": 77.5696,
        "category": "railway",
        "city": "Bengaluru",
    },
    {
        "place_id": 10022,
        "name": "Koramangala Sony World Junction",
        "display_name": "Sony World Signal, 80 Feet Road, Koramangala 4th Block, Bengaluru, Karnataka",
        "latitude": 12.9344,
        "longitude": 77.6271,
        "category": "mall",
        "city": "Bengaluru",
    },
    {
        "place_id": 10023,
        "name": "Indiranagar 100 Feet Road",
        "display_name": "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka",
        "latitude": 12.9719,
        "longitude": 77.6412,
        "category": "mall",
        "city": "Bengaluru",
    },
    {
        "place_id": 10024,
        "name": "Electronic City Phase 1",
        "display_name": "Electronic City Toll Gate, Phase 1, Bengaluru, Karnataka",
        "latitude": 12.8452,
        "longitude": 77.6602,
        "category": "metro",
        "city": "Bengaluru",
    },

    # --- Jaipur & Rajasthan ---
    {
        "place_id": 10030,
        "name": "Jaipur International Airport (JAI)",
        "display_name": "Jaipur International Airport, Jagatpura Road, Sanganer, Jaipur, Rajasthan",
        "latitude": 26.8289,
        "longitude": 75.8056,
        "category": "airport",
        "city": "Jaipur",
    },
    {
        "place_id": 10031,
        "name": "Jaipur Junction Railway Station",
        "display_name": "Jaipur Junction Railway Station, Station Road, Gopalbari, Jaipur, Rajasthan",
        "latitude": 26.9200,
        "longitude": 75.7878,
        "category": "railway",
        "city": "Jaipur",
    },
    {
        "place_id": 10032,
        "name": "Hawa Mahal & City Palace",
        "display_name": "Hawa Mahal, Badi Choupad, Pink City, Jaipur, Rajasthan",
        "latitude": 26.9239,
        "longitude": 75.8267,
        "category": "landmark",
        "city": "Jaipur",
    },
    {
        "place_id": 10033,
        "name": "World Trade Park (WTP Mall)",
        "display_name": "World Trade Park, Jawahar Lal Nehru Marg, Malviya Nagar, Jaipur, Rajasthan",
        "latitude": 26.8539,
        "longitude": 75.8052,
        "category": "mall",
        "city": "Jaipur",
    },
    {
        "place_id": 10034,
        "name": "Sindhi Camp Inter State Bus Stand",
        "display_name": "Sindhi Camp Central Bus Stand, Station Road, Jaipur, Rajasthan",
        "latitude": 26.9248,
        "longitude": 75.8003,
        "category": "bus",
        "city": "Jaipur",
    },

    # --- Hyderabad ---
    {
        "place_id": 10040,
        "name": "Rajiv Gandhi International Airport (HYD)",
        "display_name": "Rajiv Gandhi International Airport, Shamshabad, Hyderabad, Telangana",
        "latitude": 17.2403,
        "longitude": 78.4294,
        "category": "airport",
        "city": "Hyderabad",
    },
    {
        "place_id": 10041,
        "name": "HITEC City & Cyber Towers",
        "display_name": "Cyber Towers, HITEC City, Madhapur, Hyderabad, Telangana",
        "latitude": 17.4504,
        "longitude": 78.3808,
        "category": "mall",
        "city": "Hyderabad",
    },
    {
        "place_id": 10042,
        "name": "Secunderabad Railway Station",
        "display_name": "Secunderabad Railway Station, Station Road, Secunderabad, Telangana",
        "latitude": 17.4344,
        "longitude": 78.5013,
        "category": "railway",
        "city": "Hyderabad",
    },

    # --- Pune ---
    {
        "place_id": 10050,
        "name": "Pune International Airport (PNQ)",
        "display_name": "Pune Airport, New Airport Road, Lohegaon, Pune, Maharashtra",
        "latitude": 18.5822,
        "longitude": 73.9197,
        "category": "airport",
        "city": "Pune",
    },
    {
        "place_id": 10051,
        "name": "Pune Junction Railway Station",
        "display_name": "Pune Junction Railway Station, Agarkar Nagar, Pune, Maharashtra",
        "latitude": 18.5284,
        "longitude": 73.8744,
        "category": "railway",
        "city": "Pune",
    },
    {
        "place_id": 10052,
        "name": "Hinjawadi IT Park (Phase 1)",
        "display_name": "Rajiv Gandhi Infotech Park, Hinjawadi Phase 1, Pune, Maharashtra",
        "latitude": 18.5912,
        "longitude": 73.7389,
        "category": "mall",
        "city": "Pune",
    },

    # --- Kolkata ---
    {
        "place_id": 10060,
        "name": "Netaji Subhash Chandra Bose Airport (CCU)",
        "display_name": "Netaji Subhash Chandra Bose International Airport, Dum Dum, Kolkata, West Bengal",
        "latitude": 22.6547,
        "longitude": 88.4467,
        "category": "airport",
        "city": "Kolkata",
    },
    {
        "place_id": 10061,
        "name": "Howrah Railway Station",
        "display_name": "Howrah Railway Station, Station Road, Howrah, West Bengal",
        "latitude": 22.5839,
        "longitude": 88.3433,
        "category": "railway",
        "city": "Kolkata",
    },

    # --- Chennai ---
    {
        "place_id": 10070,
        "name": "Chennai International Airport (MAA)",
        "display_name": "Chennai International Airport, GST Road, Meenambakkam, Chennai, Tamil Nadu",
        "latitude": 12.9941,
        "longitude": 80.1709,
        "category": "airport",
        "city": "Chennai",
    },
    {
        "place_id": 10071,
        "name": "Puratchi Thalaivar Dr. MGR Central Station (MAS)",
        "display_name": "Chennai Central Railway Station, Kannappar Thidal, Periyamet, Chennai, Tamil Nadu",
        "latitude": 13.0827,
        "longitude": 80.2755,
        "category": "railway",
        "city": "Chennai",
    },
]


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon points."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _categorize_place(item: dict) -> str:
    name = (item.get("name") or "").lower()
    disp = (item.get("display_name") or "").lower()
    ptype = (item.get("type") or "").lower()
    pclass = (item.get("class") or "").lower()

    if "airport" in name or "aerodrome" in ptype or "terminal" in name:
        return "airport"
    if "station" in name or "railway" in name or "junction" in name or ptype in ["station", "train_station"]:
        return "railway"
    if "metro" in name or "subway" in name:
        return "metro"
    if "bus" in name or "transit" in name:
        return "bus"
    if "mall" in name or "market" in name or "shopping" in name or pclass == "shop":
        return "mall"
    if "university" in name or "college" in name or "school" in name:
        return "university"
    if "hospital" in name or "clinic" in name:
        return "hospital"
    if pclass in ["tourism", "historic"] or "fort" in name or "palace" in name or "mahal" in name:
        return "landmark"
    return "pin"


async def search_locations_autocomplete(
    query: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    limit: int = 6
) -> List[dict]:
    """
    Returns location suggestions:
    - If query is empty: returns curated popular nearby transit hubs
    - If query is provided: queries OSM Nominatim autocomplete with fallback to local curated places
    """
    query_clean = (query or "").strip().lower()

    # Zero-state: User opened dropdown without typing
    if len(query_clean) < 2:
        hubs = list(POPULAR_TRANSIT_HUBS)
        if lat is not None and lon is not None:
            # Sort by proximity to user
            for h in hubs:
                h["distance_km"] = round(_haversine_distance(lat, lon, h["latitude"], h["longitude"]), 1)
            hubs.sort(key=lambda x: x.get("distance_km", 9999))
        return hubs[:limit]

    # Active search: First search Nominatim
    results = []
    try:
        params = {
            "q": query_clean,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": limit,
            "countrycodes": "in",
        }
        # If user coordinates are given, viewbox bias near the user
        if lat is not None and lon is not None:
            delta = 0.5  # ~50km bounding box
            params["viewbox"] = f"{lon - delta},{lat + delta},{lon + delta},{lat - delta}"
            params["bounded"] = 0  # prefer within box, but don't strictly exclude

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{NOMINATIM_BASE}/search", params=params, headers=HEADERS)
            if resp.status_code == 200:
                raw_items = resp.json()
                for item in raw_items:
                    parsed = _parse_geocode_response(item)
                    parsed["category"] = _categorize_place(item)
                    if lat is not None and lon is not None:
                        parsed["distance_km"] = round(
                            _haversine_distance(lat, lon, parsed["latitude"], parsed["longitude"]), 1
                        )
                    results.append(parsed)
    except Exception:
        # Nominatim timeout or offline: gracefully continue with curated fallback
        pass

    # Merge matching popular transit hubs if results are sparse
    for hub in POPULAR_TRANSIT_HUBS:
        if query_clean in hub["name"].lower() or query_clean in hub["display_name"].lower():
            if not any(r["name"] == hub["name"] for r in results):
                hub_copy = dict(hub)
                if lat is not None and lon is not None:
                    hub_copy["distance_km"] = round(
                        _haversine_distance(lat, lon, hub["latitude"], hub["longitude"]), 1
                    )
                results.append(hub_copy)

    return results[:limit]


async def search_location(query: str) -> dict:
    """Convert name/address → coordinates (forward geocoding)"""
    # Check if query matches a curated hub first
    for hub in POPULAR_TRANSIT_HUBS:
        if hub["name"].lower() == query.strip().lower():
            return hub

    async with httpx.AsyncClient(timeout=6.0) as client:
        response = await client.get(
            f"{NOMINATIM_BASE}/search",
            params={
                "q": query,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": 1,
                "countrycodes": "in",
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
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(
                f"{NOMINATIM_BASE}/reverse",
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "jsonv2",
                    "zoom": 18,
                    "addressdetails": 1,
                },
                headers=HEADERS,
            )
            if response.status_code == 200:
                result = response.json()
                if "error" not in result and "lat" in result:
                    return _parse_geocode_response(result)
    except Exception:
        pass

    # Graceful fallback if geocoding times out or point is unmapped
    return {
        "place_id": None,
        "display_name": f"Location ({lat:.5f}, {lon:.5f})",
        "latitude": float(lat),
        "longitude": float(lon),
        "name": f"Point ({lat:.4f}, {lon:.4f})",
        "road": None,
        "city": None,
        "postcode": None,
        "country": None,
        "country_code": None,
    }


def _parse_geocode_response(data: dict) -> dict:
    """Extract only the fields we care about from the API response"""
    address = data.get("address", {})
    name = data.get("name")
    if not name:
        name = (
            address.get("amenity")
            or address.get("building")
            or address.get("road")
            or address.get("suburb")
            or address.get("city")
            or data.get("display_name", "").split(",")[0]
        )

    lat_val = float(data.get("lat") or 0.0)
    lon_val = float(data.get("lon") or 0.0)

    # Clean display name: trim excessive postal hierarchy
    raw_disp = data.get("display_name", "")
    parts = [p.strip() for p in raw_disp.split(",") if p.strip()]
    clean_disp = ", ".join(parts[:4]) if len(parts) > 4 else raw_disp

    return {
        "place_id":    data.get("place_id"),
        "display_name": clean_disp or f"{lat_val:.5f}, {lon_val:.5f}",
        "latitude":    lat_val,
        "longitude":   lon_val,
        "name":        name or clean_disp or f"Point ({lat_val:.4f}, {lon_val:.4f})",
        "road":        address.get("road"),
        "city":        address.get("city") or address.get("town") or address.get("village"),
        "postcode":    address.get("postcode"),
        "country":     address.get("country"),
        "country_code": address.get("country_code"),
    }
