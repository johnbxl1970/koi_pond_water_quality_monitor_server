-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('DO_FORECAST', 'NH3_FORECAST', 'ANOMALY_SCORE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataContributionConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PredictionEvent" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "kind" "PredictionKind" NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetTime" TIMESTAMP(3) NOT NULL,
    "predicted" JSONB NOT NULL,
    "actualForTime" TIMESTAMP(3),
    "actual" JSONB,

    CONSTRAINT "PredictionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "kind" "PredictionKind" NOT NULL,
    "version" TEXT NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictionEvent_pondId_kind_predictedAt_idx" ON "PredictionEvent"("pondId", "kind", "predictedAt");

-- CreateIndex
CREATE INDEX "PredictionEvent_targetTime_actualForTime_idx" ON "PredictionEvent"("targetTime", "actualForTime");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_version_key" ON "ModelVersion"("version");

-- CreateIndex
CREATE INDEX "ModelVersion_kind_isActive_idx" ON "ModelVersion"("kind", "isActive");

-- AddForeignKey
ALTER TABLE "PredictionEvent" ADD CONSTRAINT "PredictionEvent_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
