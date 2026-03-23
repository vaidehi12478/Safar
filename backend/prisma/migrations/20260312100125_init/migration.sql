/*
  Warnings:

  - The primary key for the `Ride` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `destination` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Ride` table. All the data in the column will be lost.
  - Added the required column `destination_location_id` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_location_id` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rider_id` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RIDER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_userId_fkey";

-- AlterTable
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_pkey",
DROP COLUMN "destination",
DROP COLUMN "id",
DROP COLUMN "origin",
DROP COLUMN "userId",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "destination_location_id" INTEGER NOT NULL,
ADD COLUMN     "driver_id" INTEGER,
ADD COLUMN     "pickup_location_id" INTEGER NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ride_id" SERIAL NOT NULL,
ADD COLUMN     "rider_id" INTEGER NOT NULL,
ADD COLUMN     "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
ADD CONSTRAINT "Ride_pkey" PRIMARY KEY ("ride_id");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'RIDER';

-- CreateTable
CREATE TABLE "Driver" (
    "driver_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "DriverStatus" NOT NULL DEFAULT 'OFFLINE',

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "place_id" INTEGER,
    "display_name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT,
    "road" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLocation" (
    "id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_user_id_key" ON "Driver"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Location_place_id_key" ON "Location"("place_id");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("driver_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;
