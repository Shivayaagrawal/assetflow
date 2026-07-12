"use server";

import { deactivateEmployeeService } from "@/modules/identity/services/deactivate-employee.service";
import { updateEmployeeRoleService } from "@/modules/identity/services/update-employee-role.service";
import { employeeRoleSchema } from "@/modules/identity/validators/employee-role.schema";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function deactivateEmployeeAction(userId: string) {
  return runAction(async () => {
    const user = await requireSessionUser();
    return deactivateEmployeeService.execute(user, userId);
  });
}

export async function updateEmployeeRoleAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = employeeRoleSchema.parse(input);
    return updateEmployeeRoleService.execute(user, data);
  });
}

export async function deactivateEmployee(userId: string) {
  return throwOnFailure(await deactivateEmployeeAction(userId));
}

export async function updateEmployeeRole(input: unknown) {
  return throwOnFailure(await updateEmployeeRoleAction(input));
}
