from fastapi import FastAPI
from config.database import engine
from app.db.base import Base
from app.api.routers import auth, ride, driver
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ride.router, prefix="/api/rides", tags=["rides"])
app.include_router(driver.router, prefix="/api/driver", tags=["driver"])

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


@app.get("/")
async def root():
    return {"message": "Safar API running"}