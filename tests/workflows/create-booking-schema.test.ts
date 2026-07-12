import { describe, it, expect } from "vitest";
import { createBookingSchema } from "@/modules/booking/validators/create-booking.schema";

describe("CreateBookingSchema", () => {
  it("rejects end before start", () => {
    const result = createBookingSchema.safeParse({
      assetId: "a1",
      startTime: new Date("2026-07-12T11:00:00Z"),
      endTime: new Date("2026-07-12T10:00:00Z"),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid range", () => {
    const result = createBookingSchema.safeParse({
      assetId: "a1",
      startTime: new Date("2026-07-12T10:00:00Z"),
      endTime: new Date("2026-07-12T11:00:00Z"),
    });
    expect(result.success).toBe(true);
  });
});
