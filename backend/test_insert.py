import sys
import os
import asyncio

sys.path.append(os.getcwd())
try:
    from config.database import db
    from app.core.security import get_password_hash
except ImportError as e:
    print("Import error:", e)
    sys.exit(1)

async def test_insert():
    await db.connect()
    hashed = get_password_hash('test')
    print('Hashed length:', len(hashed))
    print('Testing DB insert...')
    try:
        new_user = await db.user.create(
            data={
                'name': 'DB Test',
                'email': 'dbtest4@example.com',
                'password': hashed,
                'role': 'RIDER'
            }
        )
        print('Success:', new_user.id)
    except Exception as e:
        import traceback
        traceback.print_exc()
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(test_insert())
