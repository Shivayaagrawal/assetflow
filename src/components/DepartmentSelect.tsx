type DepartmentOption = {
  id: string;
  name: string;
};

type DepartmentSelectProps = {
  departments: DepartmentOption[];
  name?: string;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  includeEmpty?: boolean;
};

export function DepartmentSelect({
  departments,
  name = "departmentId",
  required = false,
  defaultValue = "",
  disabled = false,
  placeholder = "Select department",
  includeEmpty = true,
}: DepartmentSelectProps) {
  return (
    <select
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
      required={required}
    >
      {includeEmpty && <option value="">{placeholder}</option>}
      {departments.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </select>
  );
}
