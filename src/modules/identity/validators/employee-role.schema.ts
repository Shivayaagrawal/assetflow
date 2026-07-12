import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

const optionalId = z.string().min(1).optional().nullable();

export const employeeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(UserRole),
  departmentId: optionalId,
  status: z.nativeEnum(UserStatus).optional(),
});

export type EmployeeRoleInput = z.infer<typeof employeeRoleSchema>;
