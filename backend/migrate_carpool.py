"""
Migration script: Add carpool feature columns to existing tables.
Run this ONCE:  python migrate_carpool.py
"""
import asyncio
from config.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        # 1. Create carpool_group table (if not exists — handled by create_all,
        #    but we also handle it here for safety)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS carpool_group (
                id SERIAL PRIMARY KEY,
                "driverId" INTEGER REFERENCES driver(id),
                status VARCHAR(20) DEFAULT 'WAITING',
                "maxSeats" INTEGER DEFAULT 4,
                "createdAt" TIMESTAMP DEFAULT NOW(),
                "expiresAt" TIMESTAMP,
                "routeAreaLat" FLOAT,
                "routeAreaLng" FLOAT,
                "routeAreaDestLat" FLOAT,
                "routeAreaDestLng" FLOAT,
                "waypointOrder" VARCHAR
            );
        """))
        print("✅ carpool_group table created (or already exists)")

        # 2. Create the rideType enum type
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ridetypeenum') THEN
                    CREATE TYPE ridetypeenum AS ENUM ('SOLO', 'CARPOOL');
                END IF;
            END$$;
        """))
        print("✅ ridetypeenum type created (or already exists)")

        # 3. Add new columns to ride table
        # rideType
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='ride' AND column_name='rideType'
                ) THEN
                    ALTER TABLE ride ADD COLUMN "rideType" ridetypeenum DEFAULT 'SOLO' NOT NULL;
                END IF;
            END$$;
        """))
        print("✅ ride.rideType column added (or already exists)")

        # carpoolGroupId
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='ride' AND column_name='carpoolGroupId'
                ) THEN
                    ALTER TABLE ride ADD COLUMN "carpoolGroupId" INTEGER REFERENCES carpool_group(id);
                END IF;
            END$$;
        """))
        print("✅ ride.carpoolGroupId column added (or already exists)")

        # riderDistanceKm
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='ride' AND column_name='riderDistanceKm'
                ) THEN
                    ALTER TABLE ride ADD COLUMN "riderDistanceKm" FLOAT;
                END IF;
            END$$;
        """))
        print("✅ ride.riderDistanceKm column added (or already exists)")

        # 4. Add availableSeats to driver table
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='driver' AND column_name='availableSeats'
                ) THEN
                    ALTER TABLE driver ADD COLUMN "availableSeats" INTEGER DEFAULT 3;
                END IF;
            END$$;
        """))
        print("✅ driver.availableSeats column added (or already exists)")

        # 5. Create the carpoolgroup status enum type
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'carpoolgroupstatusenum') THEN
                    CREATE TYPE carpoolgroupstatusenum AS ENUM ('WAITING', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
                END IF;
            END$$;
        """))
        print("✅ carpoolgroupstatusenum type created (or already exists)")

    await engine.dispose()
    print("\n🎉 Carpool migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
