-- AlterTable
ALTER TABLE "ModelVersion" ADD COLUMN     "pondId" TEXT;

-- CreateIndex
CREATE INDEX "ModelVersion_pondId_kind_isActive_idx" ON "ModelVersion"("pondId", "kind", "isActive");

-- AddForeignKey
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;
