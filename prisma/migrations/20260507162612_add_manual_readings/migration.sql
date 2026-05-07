-- DropIndex
DROP INDEX "Telemetry_time_idx";

-- AlterTable
ALTER TABLE "Telemetry" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'device';

-- CreateTable
CREATE TABLE "ManualReading" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "phVal" DOUBLE PRECISION,
    "tempC" DOUBLE PRECISION,
    "doMgL" DOUBLE PRECISION,
    "orpMv" DOUBLE PRECISION,
    "tdsPpm" DOUBLE PRECISION,
    "turbidityNtu" DOUBLE PRECISION,
    "nh3TotalPpm" DOUBLE PRECISION,
    "nh3FreePpm" DOUBLE PRECISION,
    "no2Ppm" DOUBLE PRECISION,
    "no3Ppm" DOUBLE PRECISION,
    "khDkh" DOUBLE PRECISION,
    "ghDgh" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualReading_pondId_time_idx" ON "ManualReading"("pondId", "time");

-- AddForeignKey
ALTER TABLE "ManualReading" ADD CONSTRAINT "ManualReading_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReading" ADD CONSTRAINT "ManualReading_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
