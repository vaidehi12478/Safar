from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from config.database import engine
from app.db.base import Base
from app.api.routers import auth, ride, driver, tracking, users, carpool, payment
from fastapi.middleware.cors import CORSMiddleware
import traceback
import logging

logger = logging.getLogger("safar.main")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal server error"},
        headers=headers,
    )

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ride.router, prefix="/api/rides", tags=["rides"])
app.include_router(driver.router, prefix="/api/drivers", tags=["driver"])
app.include_router(tracking.router, tags=["tracking"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(carpool.router, prefix="/api/carpool", tags=["carpool"])
app.include_router(payment.router, prefix="/api/payments/razorpay", tags=["payments"])

@app.on_event("startup")
async def startup():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Recover broken dispatch tasks for stranded requested rides (due to server restarts)
    from config.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models import Ride, RideStatusEnum, RideTypeEnum
    from app.models.carpool_group import CarpoolGroup, CarpoolGroupStatusEnum
    from app.services.dispatch import dispatch_ride_task
    from app.services.carpool import carpool_window_watcher
    from app.services.ride import background_tasks
    import asyncio

    async with AsyncSessionLocal() as db:
        # Recover solo rides
        result = await db.execute(
            select(Ride).where(
                Ride.status == RideStatusEnum.REQUESTED,
                Ride.rideType == RideTypeEnum.SOLO,
            )
        )
        stranded_rides = result.scalars().all()
        for r in stranded_rides:
            task = asyncio.create_task(dispatch_ride_task(r.id))
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)

        # Recover stranded carpool groups still in WAITING state
        result = await db.execute(
            select(CarpoolGroup).where(
                CarpoolGroup.status == CarpoolGroupStatusEnum.WAITING
            )
        )
        stranded_groups = result.scalars().all()
        for g in stranded_groups:
            task = asyncio.create_task(carpool_window_watcher(g.id))
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)


@app.get("/")
async def root():
    return {"message": "Safar API running"}