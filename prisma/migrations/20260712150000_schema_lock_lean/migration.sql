-- DropForeignKey
ALTER TABLE "Allocation" DROP CONSTRAINT "Allocation_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Allocation" DROP CONSTRAINT "Allocation_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "AuditCycle" DROP CONSTRAINT "AuditCycle_scopeDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "AuditCycleAuditor" DROP CONSTRAINT "AuditCycleAuditor_auditCycleId_fkey";

-- DropForeignKey
ALTER TABLE "AuditItem" DROP CONSTRAINT "AuditItem_auditCycleId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_parentDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "TransferRequest" DROP CONSTRAINT "TransferRequest_assetId_fkey";

-- DropForeignKey
ALTER TABLE "TransferRequest" DROP CONSTRAINT "TransferRequest_fromAllocationId_fkey";

-- DropForeignKey
ALTER TABLE "TransferRequest" DROP CONSTRAINT "TransferRequest_requestedById_fkey";

-- DropIndex
DROP INDEX "ActivityLog_actorId_idx";

-- DropIndex
DROP INDEX "ActivityLog_createdAt_idx";

-- DropIndex
DROP INDEX "ActivityLog_targetEntityType_targetEntityId_idx";

-- DropIndex
DROP INDEX "Allocation_departmentId_idx";

-- DropIndex
DROP INDEX "Allocation_employeeId_idx";

-- DropIndex
DROP INDEX "AuditCycle_scopeDepartmentId_idx";

-- DropIndex
DROP INDEX "AuditItem_verificationStatus_idx";

-- DropIndex
DROP INDEX "Booking_bookedById_idx";

-- DropIndex
DROP INDEX "Department_parentDepartmentId_idx";

-- DropIndex
DROP INDEX "Department_status_idx";

-- DropIndex
DROP INDEX "MaintenanceRequest_raisedById_idx";

-- DropIndex
DROP INDEX "Notification_relatedEntityType_relatedEntityId_type_idx";

-- DropIndex
DROP INDEX "TransferRequest_assetId_idx";

-- DropIndex
DROP INDEX "TransferRequest_fromAllocationId_idx";

-- DropIndex
DROP INDEX "TransferRequest_requestedById_idx";

-- Booking EXCLUDE must drop before timestamptz -> timestamp conversion
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "no_overlapping_bookings";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "idToken",
DROP COLUMN "scope";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "actionType",
DROP COLUMN "description",
DROP COLUMN "targetEntityId",
DROP COLUMN "targetEntityType",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Allocation" DROP COLUMN "conditionCheckinNotes",
DROP COLUMN "departmentId",
DROP COLUMN "employeeId",
ADD COLUMN     "conditionNotes" TEXT,
ADD COLUMN     "holderDepartmentId" TEXT,
ADD COLUMN     "holderEmployeeId" TEXT;

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "condition",
DROP COLUMN "photoUrl",
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "acquisitionDate" DROP NOT NULL,
ALTER COLUMN "acquisitionCost" SET DEFAULT 0,
ALTER COLUMN "location" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AssetCategory" DROP COLUMN "isActive",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "AuditCycle" DROP COLUMN "dateRangeEnd",
DROP COLUMN "dateRangeStart",
DROP COLUMN "scopeLocation",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AuditCycleAuditor" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "AuditItem" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "expectedLocation" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "purpose" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "parentDepartmentId",
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceRequest" DROP COLUMN "issueDescription",
DROP COLUMN "photoUrl",
ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TransferRequest" DROP COLUMN "assetId",
DROP COLUMN "fromAllocationId",
DROP COLUMN "requestedById",
DROP COLUMN "toDepartmentId",
ADD COLUMN     "allocationId" TEXT NOT NULL,
ADD COLUMN     "fromEmployeeId" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ALTER COLUMN "toEmployeeId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "updatedAt";

-- DropEnum
DROP TYPE "AssetCondition";

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Allocation_holderEmployeeId_idx" ON "Allocation"("holderEmployeeId");

-- CreateIndex
CREATE INDEX "Allocation_holderDepartmentId_idx" ON "Allocation"("holderDepartmentId");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateIndex
CREATE INDEX "TransferRequest_allocationId_idx" ON "TransferRequest"("allocationId");

-- CreateIndex
CREATE INDEX "TransferRequest_approvedById_idx" ON "TransferRequest"("approvedById");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_holderEmployeeId_fkey" FOREIGN KEY ("holderEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_holderDepartmentId_fkey" FOREIGN KEY ("holderDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditCycleAuditor" ADD CONSTRAINT "AuditCycleAuditor_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "AuditCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "AuditCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "notification_dedup_key" RENAME TO "Notification_type_relatedEntityId_recipientId_key";

-- Recreate booking overlap constraint (tsrange matches TIMESTAMP(3) columns)
ALTER TABLE "Booking" ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING GIST (
    "assetId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status IN ('UPCOMING', 'ONGOING'));
