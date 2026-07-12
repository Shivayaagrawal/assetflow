import { listDepartments } from "@/modules/organization/queries/organization.queries";

type DepartmentPickerProps = {
  name?: string;
  required?: boolean;
  defaultValue?: string;
  activeOnly?: boolean;
};

export async function DepartmentPicker({
  name = "departmentId",
  required = false,
  defaultValue = "",
  activeOnly = true,
}: DepartmentPickerProps) {
  const departments = await listDepartments({ activeOnly });

  return (
    <select defaultValue={defaultValue} name={name} required={required}>
      <option value="">Select department</option>
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </select>
  );
}
