import sys
import os
import asyncio

sys.path.append(os.getcwd())
from config.database import db
from app.core.security import verify_password

async def test_login():
    await db.connect()
    user = await db.user.find_unique(where={'email': 'push2@example.com'})
    print('User found:', user is not None)
    if user:
        print('Verifying password:', verify_password('password123', user.password))
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(test_login())
