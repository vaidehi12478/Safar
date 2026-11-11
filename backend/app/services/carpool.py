import asyncio
import math
import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Ride, RideStatusEnum, RideTypeEnum, Driver, DriverStatusEnum, DriverLocation
from app.models.carpool_group import CarpoolGroup, CarpoolGroupStatusEnum
from app.services.routing import (
    calculate_carpool_fare,
    build_optimal_waypoint_order,
    get_multi_stop_route,
)
from config.database import AsyncSessionLocal

# ─────────────────────────────────────────────
# Logger
# ─────────────────────────────────────────────
logger = logging.getLogger("carpool_logger")
logger.setLevel(logging.DEBUG)
handler = logging.FileHandler("carpool_trace.log")
handler.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
if not logger.handlers:
    logger.addHandler(handler)

# ─────────────────────────────────────────────
# Constants  (tune these freely)
# ─────────────────────────────────────────────
MATCHING_WINDOW_SECONDS = 120    # How long to wait for more riders (2 min)
MAX_PICKUP_DETOUR_KM    = 3.0   # Pickups must be within 3 km of each other
MAX_DIRECTION_ANGLE_DEG = 60    # Destinations must be within 60° of each other
MAX_CARPOOL_SEATS       = 4


# ─────────────────────────────────────────────
# Geometry Helpers
# ─────────────────────────────────────────────
def haversine(lat1, lng1, lat2, lng2) -> float:
    """Straight-line distance in km between two GPS points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compass_bearing(lat1, lng1, lat2, lng2) -> float:
    """Compass bearing (0–360°) from point A → point B."""
    dlng = lng2 - lng1
    dlat = lat2 - lat1
    return math.degrees(math.atan2(dlng, dlat)) % 360


def angle_diff(a: float, b: float) -> float:
    """Smallest angle between two compass bearings (0–180°)."""
    diff = abs(a - b) % 360
    return diff if diff <= 180 else 360 - diff


# ─────────────────────────────────────────────
# Compatibility Check
# ─────────────────────────────────────────────
def is_compatible_route(
    group: CarpoolGroup,
    new_pickup_lat: float, new_pickup_lng: float,
    new_dest_lat: float,   new_dest_lng: float,
) -> bool:
    """
    Returns True only if BOTH conditions are met:
    1. New rider's pickup is within MAX_PICKUP_DETOUR_KM of group's pickup center.
    2. New rider's destination direction is within MAX_DIRECTION_ANGLE_DEG of group's direction.
    """
    # Check 1: Pickup proximity
    pickup_dist = haversine(
        group.routeAreaLat, group.routeAreaLng,
        new_pickup_lat, new_pickup_lng
    )
    if pickup_dist > MAX_PICKUP_DETOUR_KM:
        logger.info(f"Group {group.id}: Pickup too far ({pickup_dist:.2f} km > {MAX_PICKUP_DETOUR_KM} km)")
        return False

    # Check 2: Destination direction
    if group.routeAreaDestLat is not None and group.routeAreaDestLng is not None:
        group_bearing = compass_bearing(
            group.routeAreaLat, group.routeAreaLng,
            group.routeAreaDestLat, group.routeAreaDestLng
        )
        new_bearing = compass_bearing(
            new_pickup_lat, new_pickup_lng,
            new_dest_lat, new_dest_lng
        )
        bearing_diff = angle_diff(group_bearing, new_bearing)
        if bearing_diff > MAX_DIRECTION_ANGLE_DEG:
            logger.info(f"Group {group.id}: Direction incompatible ({bearing_diff:.1f}° > {MAX_DIRECTION_ANGLE_DEG}°)")
            return False

    logger.info(f"Group {group.id}: Compatible! pickup_dist={pickup_dist:.2f}km")
    return True


# ─────────────────────────────────────────────
# Core Matching Logic
# ─────────────────────────────────────────────
async def find_or_create_carpool_group(
    ride: Ride, db: AsyncSession
) -> CarpoolGroup:
    """
    1. Search for an open CarpoolGroup whose pickup center is nearby
       AND destination direction is compatible.
    2. If found and has space → join it, update centroids.
    3. If not → create a new group.
    """
    pickup_lat = ride.pickup_location.latitude
    pickup_lng = ride.pickup_location.longitude
    dest_lat   = ride.destination_location.latitude
    dest_lng   = ride.destination_location.longitude
    now        = datetime.utcnow()

    result = await db.execute(
        select(CarpoolGroup)
        .options(selectinload(CarpoolGroup.rides))
        .where(
            CarpoolGroup.status == CarpoolGroupStatusEnum.WAITING,
            CarpoolGroup.expiresAt > now,
        )
    )
    open_groups = result.scalars().all()
    logger.info(f"Ride {ride.id}: Found {len(open_groups)} open carpool groups")

    for group in open_groups:
        if len(group.rides) >= group.maxSeats:
            continue
        if is_compatible_route(group, pickup_lat, pickup_lng, dest_lat, dest_lng):
            # ─── Join this group ───
            ride.carpoolGroupId = group.id

            # Update pickup centroid (rolling average)
            n = len(group.rides) + 1  # +1 for the new rider
            group.routeAreaLat = ((group.routeAreaLat * (n - 1)) + pickup_lat) / n
            group.routeAreaLng = ((group.routeAreaLng * (n - 1)) + pickup_lng) / n

            # Update destination centroid
            if group.routeAreaDestLat is None:
                group.routeAreaDestLat = dest_lat
                group.routeAreaDestLng = dest_lng
            else:
                group.routeAreaDestLat = ((group.routeAreaDestLat * (n - 1)) + dest_lat) / n
                group.routeAreaDestLng = ((group.routeAreaDestLng * (n - 1)) + dest_lng) / n

            await db.commit()
            logger.info(f"Ride {ride.id}: Joined existing group {group.id} (now {n} riders)")
            return group

    # ─── No compatible group → create new one ───
    group = CarpoolGroup(
        status           = CarpoolGroupStatusEnum.WAITING,
        maxSeats         = MAX_CARPOOL_SEATS,
        expiresAt        = datetime.utcnow() + timedelta(seconds=MATCHING_WINDOW_SECONDS),
        routeAreaLat     = pickup_lat,
        routeAreaLng     = pickup_lng,
        routeAreaDestLat = dest_lat,
        routeAreaDestLng = dest_lng,
    )
    db.add(group)
    await db.flush()
    ride.carpoolGroupId = group.id
    await db.commit()
    logger.info(f"Ride {ride.id}: Created new carpool group {group.id}")
    return group


# ─────────────────────────────────────────────
# Window Watcher Background Task
# ─────────────────────────────────────────────
async def carpool_window_watcher(group_id: int):
    """
    Sleeps for the matching window duration, then:
    1. Locks in the group (no more joiners).
    2. Builds optimal waypoint order.
    3. Calculates per-rider proportional fares.
    4. Dispatches a driver for the group.
    """
    logger.info(f"Group {group_id}: Window watcher started, sleeping {MATCHING_WINDOW_SECONDS}s")
    await asyncio.sleep(MATCHING_WINDOW_SECONDS)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CarpoolGroup)
            .options(
                selectinload(CarpoolGroup.rides).selectinload(Ride.pickup_location),
                selectinload(CarpoolGroup.rides).selectinload(Ride.destination_location),
            )
            .where(CarpoolGroup.id == group_id)
        )
        group = result.scalars().first()

        if not group or group.status != CarpoolGroupStatusEnum.WAITING:
            logger.info(f"Group {group_id}: Already handled (status={group.status if group else 'gone'})")
            return

        rider_count = len(group.rides)
        logger.info(f"Group {group_id}: Window expired with {rider_count} rider(s)")

        # If only 1 rider joined, fall back to solo dispatch
        if rider_count == 1:
            logger.info(f"Group {group_id}: Only 1 rider, falling back to solo dispatch")
            group.status = CarpoolGroupStatusEnum.CANCELLED
            ride = group.rides[0]
            ride.carpoolGroupId = None
            ride.rideType = RideTypeEnum.SOLO
            await db.commit()

            # Trigger normal solo dispatch
            from app.services.dispatch import dispatch_ride_task
            from app.services.ride import background_tasks
            task = asyncio.create_task(dispatch_ride_task(ride.id))
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)
            return

        # ─── Build waypoint order ───
        riders_data = [
            {
                "pickup":      (r.pickup_location.latitude, r.pickup_location.longitude),
                "destination": (r.destination_location.latitude, r.destination_location.longitude),
                "ride_id":     r.id,
            }
            for r in group.rides
        ]
        waypoints = build_optimal_waypoint_order(riders_data)

        # ─── Fetch total combined route distance ───
        try:
            route_info = await get_multi_stop_route(waypoints)
            total_km   = route_info["total_distance_km"]
            group.waypointOrder = "|".join(f"{lat},{lng}" for lat, lng in waypoints)
            logger.info(f"Group {group_id}: Multi-stop route = {total_km} km")
        except Exception as e:
            logger.warning(f"Group {group_id}: Multi-stop route failed ({e}), using fallback")
            total_km = sum(r.distanceKm or 0 for r in group.rides)

        # ─── Recalculate per-rider proportional fare ───
        for ride in group.rides:
            rider_km    = ride.distanceKm or 1.0
            fare_data   = calculate_carpool_fare(rider_km, total_km, rider_count)
            ride.price  = fare_data["rider_fare"]
            ride.riderDistanceKm = rider_km
            logger.info(f"  Ride {ride.id}: {rider_km}km → ${fare_data['rider_fare']} (solo was ${fare_data['solo_fare']})")

        # ─── Lock group ───
        group.status = CarpoolGroupStatusEnum.MATCHED
        await db.commit()

    # Dispatch a driver for the whole group
    await dispatch_carpool_group(group_id)


# ─────────────────────────────────────────────
# Carpool Dispatch
# ─────────────────────────────────────────────
async def dispatch_carpool_group(group_id: int):
    """
    Find the nearest driver with enough available seats.
    Assign them to the group and all rides in the group.
    Broadcast to all riders via WebSocket.
    """
    from app.api.routers.tracking import broadcast_ride_status
    from app.services.dispatch import active_dispatches

    declined_drivers: set[int] = set()
    logger.info(f"Group {group_id}: Starting carpool dispatch")

    while True:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(CarpoolGroup)
                .options(selectinload(CarpoolGroup.rides))
                .where(CarpoolGroup.id == group_id)
            )
            group = result.scalars().first()

            if not group or group.status != CarpoolGroupStatusEnum.MATCHED:
                logger.info(f"Group {group_id}: No longer MATCHED, exiting dispatch")
                break

            required_seats = len(group.rides)

            # Find online drivers with enough seats
            drivers_result = await db.execute(
                select(Driver).where(
                    Driver.status == DriverStatusEnum.ONLINE,
                    Driver.availableSeats >= required_seats,
                    Driver.isSuspended == 0,
                )
            )
            all_eligible_drivers = drivers_result.scalars().all()
            drivers = [d for d in all_eligible_drivers
                       if d.id not in declined_drivers]

            if not drivers:
                if all_eligible_drivers:
                    logger.info(f"Group {group_id}: All eligible drivers timed out or declined, resetting declined pool")
                    declined_drivers.clear()
                    drivers = all_eligible_drivers
                else:
                    logger.info(f"Group {group_id}: No eligible drivers, waiting 5s...")
                    await asyncio.sleep(5)
                    continue

            # Pick nearest driver to pickup centroid
            best_driver_id = None
            best_dist      = float("inf")

            for d in drivers:
                loc_result = await db.execute(
                    select(DriverLocation)
                    .where(DriverLocation.driverId == d.id)
                    .order_by(DriverLocation.timestamp.desc())
                    .limit(1)
                )
                loc = loc_result.scalars().first()
                if loc:
                    dist = haversine(
                        group.routeAreaLat, group.routeAreaLng,
                        loc.latitude, loc.longitude
                    )
                    if dist < best_dist:
                        best_dist      = dist
                        best_driver_id = d.id

        if not best_driver_id:
            logger.info(f"Group {group_id}: No drivers with location, waiting 5s...")
            await asyncio.sleep(5)
            continue

        logger.info(f"Group {group_id}: Pinging driver {best_driver_id} (dist {best_dist:.2f}km)")

        # Ping driver using dispatch key prefixed with "pool_"
        dispatch_key = f"pool_{group_id}"
        active_dispatches[dispatch_key] = {
            "driver_id": best_driver_id,
            "status":    "PENDING",
            "type":      "CARPOOL",
            "group_id":  group_id,
        }

        # Wait up to 30s for driver response
        timer_expired = True
        for i in range(30):
            await asyncio.sleep(1)
            state = active_dispatches.get(dispatch_key)
            if not state:
                timer_expired = False
                break
            if state["status"] == "ACCEPTED":
                logger.info(f"Group {group_id}: Driver {best_driver_id} ACCEPTED!")
                # Assign driver to group and all rides
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(CarpoolGroup)
                        .options(selectinload(CarpoolGroup.rides))
                        .where(CarpoolGroup.id == group_id)
                    )
                    group = result.scalars().first()
                    group.driverId = best_driver_id
                    group.status = CarpoolGroupStatusEnum.IN_PROGRESS

                    for ride in group.rides:
                        ride.driverId = best_driver_id
                        ride.status   = RideStatusEnum.MATCHED

                    driver_obj = await db.get(Driver, best_driver_id)
                    driver_obj.status = DriverStatusEnum.ON_RIDE
                    await db.commit()

                # Broadcast MATCHED to every rider in the group
                for ride in group.rides:
                    await broadcast_ride_status(ride.id, "MATCHED", {
                        "message":    "Driver found for your carpool!",
                        "driver_id":  best_driver_id,
                        "is_carpool": True,
                        "group_id":   group_id,
                    })

                if dispatch_key in active_dispatches:
                    del active_dispatches[dispatch_key]
                return  # Done!

            if state["status"] == "DECLINED":
                logger.info(f"Group {group_id}: Driver {best_driver_id} DECLINED")
                declined_drivers.add(best_driver_id)
                timer_expired = False
                break

        if timer_expired:
            logger.info(f"Group {group_id}: Driver {best_driver_id} timed out (15s)")
            declined_drivers.add(best_driver_id)
        if dispatch_key in active_dispatches:
            del active_dispatches[dispatch_key]
