import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:1234@localhost:5432/safar_db')
    
    queries = [
        # User columns
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "rating" FLOAT DEFAULT 5.0;',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "numRatings" INTEGER DEFAULT 0;',
        
        # Driver columns
        'ALTER TABLE "driver" ADD COLUMN IF NOT EXISTS "numRatings" INTEGER DEFAULT 0;',
        'ALTER TABLE "driver" ADD COLUMN IF NOT EXISTS "isSuspended" INTEGER DEFAULT 0;',
        
        # Review table
        '''
        CREATE TABLE IF NOT EXISTS "review" (
            "id" SERIAL PRIMARY KEY,
            "rideId" INTEGER NOT NULL REFERENCES "ride"(id),
            "reviewerId" INTEGER NOT NULL REFERENCES "user"(id),
            "revieweeId" INTEGER NOT NULL REFERENCES "user"(id),
            "revieweeDriverId" INTEGER REFERENCES "driver"(id),
            "rating" INTEGER NOT NULL,
            "comment" TEXT,
            "createdAt" TIMESTAMP DEFAULT NOW()
        );
        '''
    ]
    
    for q in queries:
        try:
            await conn.execute(q)
            print(f'Executed: {q[:50]}...')
        except Exception as e:
            print(f'Failed: {q[:50]}... Error: {e}')
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
