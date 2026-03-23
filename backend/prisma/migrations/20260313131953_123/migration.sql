/*
  Warnings:

  - The values [AVAILABLE,BUSY] on the enum `DriverStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ACCEPTED] on the enum `RideStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Driver` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `driver_id` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle_type` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `driver_id` on the `DriverLocation` table. All the data in the column will be lost.
  - You are about to drop the column `country_code` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `place_id` on the `Location` table. All the data in the column will be lost.
  - The primary key for the `Ride` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completed_at` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `destination_location_id` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `driver_id` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_location_id` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `requested_at` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `ride_id` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `rider_id` on the `Ride` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[placeId]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverId` to the `DriverLocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLocationId` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupLocationId` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riderId` to the `Ride` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DriverStatus_new" AS ENUM ('ONLINE', 'OFFLINE', 'ON_RIDE');
ALTER TABLE "Driver" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Driver" ALTER COLUMN "status" TYPE "DriverStatus_new" USING ("status"::text::"DriverStatus_new");
ALTER TYPE "DriverStatus" RENAME TO "DriverStatus_old";
ALTER TYPE "DriverStatus_new" RENAME TO "DriverStatus";
DROP TYPE "DriverStatus_old";
ALTER TABLE "Driver" ALTER COLUMN "status" SET DEFAULT 'OFFLINE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RideStatus_new" AS ENUM ('REQUESTED', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Ride" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ride" ALTER COLUMN "status" TYPE "RideStatus_new" USING ("status"::text::"RideStatus_new");
ALTER TYPE "RideStatus" RENAME TO "RideStatus_old";
ALTER TYPE "RideStatus_new" RENAME TO "RideStatus";
DROP TYPE "RideStatus_old";
ALTER TABLE "Ride" ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_user_id_fkey";

-- DropForeignKey
ALTER TABLE "DriverLocation" DROP CONSTRAINT "DriverLocation_driver_id_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_destination_location_id_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_driver_id_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_pickup_location_id_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_rider_id_fkey";

-- DropIndex
DROP INDEX "Driver_user_id_key";

-- DropIndex
DROP INDEX "Location_place_id_key";

-- AlterTable
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_pkey",
DROP COLUMN "driver_id",
DROP COLUMN "user_id",
DROP COLUMN "vehicle_type",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "vehicleType" TEXT NOT NULL,
ALTER COLUMN "rating" SET DEFAULT 5.0,
ADD CONSTRAINT "Driver_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DriverLocation" DROP COLUMN "driver_id",
ADD COLUMN     "driverId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "country_code",
DROP COLUMN "created_at",
DROP COLUMN "display_name",
DROP COLUMN "place_id",
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "placeId" TEXT;

-- AlterTable
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_pkey",
DROP COLUMN "completed_at",
DROP COLUMN "destination_location_id",
DROP COLUMN "driver_id",
DROP COLUMN "pickup_location_id",
DROP COLUMN "requested_at",
DROP COLUMN "ride_id",
DROP COLUMN "rider_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "destinationLocationId" INTEGER NOT NULL,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "driverId" INTEGER,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "pickupLocationId" INTEGER NOT NULL,
ADD COLUMN     "riderId" INTEGER NOT NULL,
ADD CONSTRAINT "Ride_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_placeId_key" ON "Location"("placeId");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
