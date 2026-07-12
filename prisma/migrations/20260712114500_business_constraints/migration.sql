-- Business constraints migration (hand-edited, P1-only)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Booking: no overlapping time slots for same asset
ALTER TABLE "Booking" ADD CONSTRAINT booking_end_after_start
  CHECK ("endTime" > "startTime");

ALTER TABLE "Booking" ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING GIST (
    "assetId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status IN ('UPCOMING', 'ONGOING'));

-- Allocation: one active allocation per asset
CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON "Allocation" ("assetId") WHERE status = 'ACTIVE';

ALTER TABLE "Allocation" ADD CONSTRAINT return_after_allocate
  CHECK ("actualReturnDate" IS NULL OR "actualReturnDate" >= "allocatedAt");

-- Asset: non-negative cost
ALTER TABLE "Asset" ADD CONSTRAINT cost_non_negative
  CHECK ("acquisitionCost" >= 0);

-- Maintenance: one active request per asset
CREATE UNIQUE INDEX one_active_maintenance_per_asset
  ON "MaintenanceRequest" ("assetId")
  WHERE status NOT IN ('REJECTED', 'RESOLVED');

-- Notification: deduplicate by type + entity + recipient
CREATE UNIQUE INDEX notification_dedup_key
  ON "Notification" ("type", "relatedEntityId", "recipientId");
