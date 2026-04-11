-- CreateEnum
CREATE TYPE "PondRole" AS ENUM ('OWNER', 'VIEWER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComparisonOp" AS ENUM ('LT', 'LTE', 'GT', 'GTE', 'EQ', 'NEQ');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pond" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volumeM3" DOUBLE PRECISION NOT NULL,
    "koiCount" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondMember" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PondRole" NOT NULL,

    CONSTRAINT "PondMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "label" TEXT,
    "firmwareVer" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceClaim" (
    "id" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "claimTokenHash" TEXT NOT NULL,
    "pubkeyFingerprint" TEXT NOT NULL,
    "attestationCertPem" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedByPondId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCertificate" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "certPem" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "status" "CertStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "DeviceCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "time" TIMESTAMPTZ(6) NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "phaseSeq" INTEGER NOT NULL DEFAULT 0,
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
    "raw" JSONB,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("deviceId","time")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "op" "ComparisonOp" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherForecast" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forecastForTime" TIMESTAMP(3) NOT NULL,
    "tempC" DOUBLE PRECISION,
    "precipMm" DOUBLE PRECISION,
    "windKph" DOUBLE PRECISION,
    "pressureHpa" DOUBLE PRECISION,
    "cloudCoverPct" DOUBLE PRECISION,
    "raw" JSONB NOT NULL,

    CONSTRAINT "WeatherForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PondMember_pondId_userId_key" ON "PondMember"("pondId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_hardwareId_key" ON "Device"("hardwareId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceClaim_hardwareId_key" ON "DeviceClaim"("hardwareId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCertificate_serial_key" ON "DeviceCertificate"("serial");

-- CreateIndex
CREATE INDEX "DeviceCertificate_deviceId_status_idx" ON "DeviceCertificate"("deviceId", "status");

-- CreateIndex
CREATE INDEX "Telemetry_pondId_time_idx" ON "Telemetry"("pondId", "time");

-- CreateIndex
CREATE INDEX "AlertEvent_pondId_firedAt_idx" ON "AlertEvent"("pondId", "firedAt");

-- CreateIndex
CREATE INDEX "WeatherForecast_pondId_forecastForTime_idx" ON "WeatherForecast"("pondId", "forecastForTime");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondMember" ADD CONSTRAINT "PondMember_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondMember" ADD CONSTRAINT "PondMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCertificate" ADD CONSTRAINT "DeviceCertificate_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherForecast" ADD CONSTRAINT "WeatherForecast_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;
