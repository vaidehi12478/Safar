import asyncio
from config.database import db
from app.services.ride import create_ride_request
from app.schemas.ride import RideResponse

async def main():
    await db.connect()
    # Ensure there is a dummy user
    user = await db.user.find_first()
    if not user:
        user = await db.user.create({"name": "t", "email": "t@t.com", "password": "p", "role": "RIDER"})
    try:
        ride = await create_ride_request(user.id, "A", "B")
        # Validate through Pydantic
        resp = RideResponse.from_orm(ride) # V1/V2 hybrid
        print("Success:", resp)
    except Exception as e:
        print("ERROR OCCURRED:")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
