import asyncio
from config.database import db

async def main():
    await db.connect()
    user = await db.user.create(
        data={
            "name": "Test Enum",
            "email": "testenum@example.com",
            "password": "hashedpassword",
            "role": "RIDER"
        }
    )
    with open("result.txt", "w", encoding="utf-8") as f:
        f.write(f"Role value: {user.role}\n")
        f.write(f"Is string?: {isinstance(user.role, str)}\n")
        f.write(f"Is equals 'RIDER'?: {user.role == 'RIDER'}\n")
        f.write(f"Role name: {getattr(user.role, 'name', 'No name')}\n")
        f.write(f"Role value attr: {getattr(user.role, 'value', 'No value')}\n")
        
    # cleanup
    await db.user.delete(where={"id": user.id})
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
