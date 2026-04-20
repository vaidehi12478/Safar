import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/safar_db')
    try:
        await conn.execute('ALTER TABLE driver ADD COLUMN "totalEarnings" FLOAT DEFAULT 0.0;')
        print('Added totalEarnings')
    except Exception as e:
        print(e)
    try:
        await conn.execute('ALTER TABLE driver ADD COLUMN "walletBalance" FLOAT DEFAULT 0.0;')
        print('Added walletBalance')
    except Exception as e:
        print(e)
    await conn.close()

asyncio.run(main())
