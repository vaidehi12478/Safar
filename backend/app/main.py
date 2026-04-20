from fastapi import FastAPI
from config.database import engine
from app.db.base import Base
from app.api.routers import auth, ride, driver, tracking, users
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ride.router, prefix="/api/rides", tags=["rides"])
app.include_router(driver.router, prefix="/api/drivers", tags=["driver"])
app.include_router(tracking.router, tags=["tracking"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Recover broken dispatch tasks for stranded requested rides (due to server restarts)
    from config.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models import Ride, RideStatusEnum
    from app.services.dispatch import dispatch_ride_task
    from app.services.ride import background_tasks
    import asyncio

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ride).where(Ride.status == RideStatusEnum.REQUESTED))
        stranded_rides = result.scalars().all()
        for r in stranded_rides:
            task = asyncio.create_task(dispatch_ride_task(r.id))
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)


@app.get("/")
async def root():
    return {"message": "Safar API running"}