from fastapi.testclient import TestClient
from app.main import app

import asyncio
from config.database import db

client = TestClient(app)

async def setup():
    await db.connect()
    # clean up test user if any remaining
    user = await db.user.find_first(where={"email": "testapi@example.com"})
    if user:
        await db.user.delete(where={"id": user.id})
    user = await db.user.create(
        data={
            "name": "Test API Rider",
            "email": "testapi@example.com",
            "password": "hashedpassword",
            "role": "RIDER"
        }
    )
    return user

async def teardown(user_id):
    # delete rides
    await db.ride.delete_many(where={"riderId": user_id})
    # delete user
    await db.user.delete(where={"id": user_id})
    await db.disconnect()

async def main():
    user = await setup()
    
    # login to get token
    response = client.post("/api/auth/login", data={"username": "testapi@example.com", "password": "hashedpassword"})
    print("Login Response:", response.json())
    
    # Wait, the login uses verify_password which tests hashedpassword vs user's hashed password (which should be created with get_password_hash). 
    # Let me just import security to properly hash it.
    pass

if __name__ == "__main__":
    pass
