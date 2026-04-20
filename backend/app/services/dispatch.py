import asyncio
import math
from sqlalchemy import select
from app.models import Driver, DriverLocation, DriverStatusEnum, Ride, RideStatusEnum
from config.database import AsyncSessionLocal
from app.api.routers.tracking import broadcast_ride_status

# Global dictionary to track active ride dispatches
# Format: { ride_id: { "driver_id": int, "status": "PENDING" | "DECLINED" | "ACCEPTED" } }
active_dispatches = {}

import logging

# Setup purely for debugging logic
logger = logging.getLogger("dispatch_logger")
logger.setLevel(logging.DEBUG)
handler = logging.FileHandler("dispatch_trace.log")
handler.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
if not logger.handlers:
    logger.addHandler(handler)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def dispatch_ride_task(ride_id: int):
    """
    Background task to find nearest drivers and ping them one by one.
    """
    try:
        declined_drivers = set()
        
        while True:
            # Short lived DB session to avoid holding connections during sleep and stale data
            async with AsyncSessionLocal() as db:
                current_ride = await db.get(Ride, ride_id)
                if not current_ride or current_ride.status != RideStatusEnum.REQUESTED:
                    if ride_id in active_dispatches: del active_dispatches[ride_id]
                    break
                
                await db.refresh(current_ride, ['pickup_location'])
                pickup_lat = current_ride.pickup_location.latitude
                pickup_lng = current_ride.pickup_location.longitude

                result = await db.execute(
                    select(Driver).where(Driver.status == DriverStatusEnum.ONLINE)
                )
                online_drivers = result.scalars().all()
                logger.info(f"Ride {ride_id}: Found {len(online_drivers)} total ONLINE drivers. Declined so far: {declined_drivers}")

                candidates = [d for d in online_drivers if d.id not in declined_drivers]
                logger.info(f"Ride {ride_id}: Candidates after excluding declined: {[d.id for d in candidates]}")

                if not candidates and online_drivers:
                    logger.info(f"Ride {ride_id}: All online drivers have timed out or declined! Resetting the declined pool to loop them again!")
                    declined_drivers.clear()
                    candidates = online_drivers

                driver_id_to_ping = None
                if not candidates:
                    # If no fresh drivers, sleep a bit and try to find newly online drivers
                    await asyncio.sleep(5)
                    continue
                
                # Calculate distance and sort
                driver_distances = []
                for d in candidates:
                    loc_result = await db.execute(
                        select(DriverLocation)
                        .where(DriverLocation.driverId == d.id)
                        .order_by(DriverLocation.timestamp.desc())
                        .limit(1)
                    )
                    loc = loc_result.scalars().first()
                    if loc:
                        dist = haversine(pickup_lat, pickup_lng, loc.latitude, loc.longitude)
                        if dist <= 10000:
                            driver_distances.append((dist, d.id))
                        else:
                            logger.info(f"Ride {ride_id}: Driver {d.id} is too far ({dist} km)")
                    else:
                        logger.info(f"Ride {ride_id}: Driver {d.id} has no location entry!")
                
                driver_distances.sort(key=lambda x: x[0])
                if driver_distances:
                    driver_id_to_ping = driver_distances[0][1]
                    logger.info(f"Ride {ride_id}: Selected top driver {driver_id_to_ping} (distance {driver_distances[0][0]} km) among {len(driver_distances)} valid candidates")

            # Outside DB session
            if not driver_id_to_ping:
                await asyncio.sleep(5)
                continue

            # Ping the top candidate
            active_dispatches[ride_id] = {
                "driver_id": driver_id_to_ping,
                "status": "PENDING"
            }

            # Wait up to 15 seconds
            timer_expired = True
            for i in range(15):
                await asyncio.sleep(1)
                
                state = active_dispatches.get(ride_id)
                if not state:
                    timer_expired = False
                    break
                
                if state.get("status") == "ACCEPTED":
                    timer_expired = False
                    break
                    
                if state.get("status") == "DECLINED":
                    logger.info(f"Ride {ride_id}: Driver {driver_id_to_ping} explicitly DECLINED the ride.")
                    declined_drivers.add(driver_id_to_ping)
                    timer_expired = False
                    break

                # Check DB occasionally with a fresh connection
                if i % 3 == 0:
                    async with AsyncSessionLocal() as check_db:
                        r = await check_db.get(Ride, ride_id)
                        if r and r.status != RideStatusEnum.REQUESTED:
                            logger.info(f"Ride {ride_id}: Ride is no longer REQUESTED (status {r.status.value}). Exiting loop.")
                            timer_expired = False
                            break

            # If timer naturally expired without them doing anything
            if timer_expired:
                logger.info(f"Ride {ride_id}: 15 second timer expired for driver {driver_id_to_ping}.")
                declined_drivers.add(driver_id_to_ping)

        # Once while loop finishes (ride accepted or cancelled)
        logger.info(f"Ride {ride_id}: Dispatch loop completely ended.")
        if ride_id in active_dispatches:
            del active_dispatches[ride_id]

    except Exception as e:
        print(f"Error in dispatch_ride_task: {e}")
