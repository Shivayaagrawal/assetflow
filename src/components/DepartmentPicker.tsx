import { listDepartments } from "@/modules/organization/queries/organization.queries";
import { DepartmentSelect } from "@/components/DepartmentSelect";

type DepartmentPickerProps = {
  name?: string;
  required?: boolean;
  defaultValue?: string;
  activeOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  includeEmpty?: boolean;
};

export async function DepartmentPicker({
  name = "departmentId",
  required = false,
  defaultValue = "",
  activeOnly = true,
  disabled = false,
  placeholder = "Select department",
  includeEmpty = true,
}: DepartmentPickerProps) {
  const departments = await listDepartments({ activeOnly });

  return (
    <DepartmentSelect
      departments={departments}
      defaultValue={defaultValue}
      disabled={disabled}
      includeEmpty={includeEmpty}
      name={name}
      placeholder={placeholder}
      required={required}
    />
  );
}
