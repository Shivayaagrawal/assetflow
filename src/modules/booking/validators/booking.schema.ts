import { z } from "zod";

export const departmentBookingSchema = z.object({
  assetId: z.string().min(1),
  departmentId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export const rescheduleBookingSchema = z.object({
  bookingId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export type DepartmentBookingInput = z.infer<typeof departmentBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
