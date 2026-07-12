import { revalidatePath } from "next/cache";
import {
  createAssetCategory,
  createDepartment,
  updateEmployeeRole,
} from "@/features/org-setup/actions";
import {
  listAssetCategories,
  listDepartments,
  listEmployeeDirectory,
} from "@/features/org-setup/queries";

async function addDepartment(formData: FormData) {
  "use server";

  await createDepartment({
    name: String(formData.get("name")),
    parentDepartmentId: String(formData.get("parentDepartmentId") || "") || null,
    headId: String(formData.get("headId") || "") || null,
  });

  revalidatePath("/org-setup");
  revalidatePath("/dashboard");
}

async function addCategory(formData: FormData) {
  "use server";

  await createAssetCategory({
    name: String(formData.get("name")),
    type: String(formData.get("type") || "") || null,
  });

  revalidatePath("/org-setup");
}

async function updateDirectoryRole(formData: FormData) {
  "use server";

  await updateEmployeeRole({
    userId: String(formData.get("userId")),
    role: formData.get("role") as "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER" | "ADMIN",
    departmentId: String(formData.get("departmentId") || "") || null,
    status: formData.get("status") as "ACTIVE" | "INACTIVE",
  });

  revalidatePath("/org-setup");
  revalidatePath("/dashboard");
}

export default async function OrgSetupPage() {
  const [departments, categories, employees] = await Promise.all([
    listDepartments(),
    listAssetCategories(),
    listEmployeeDirectory(),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title">Organization Setup</h1>
          <p className="page-subtitle">
            Departments, categories, and role assignment from one controlled surface.
          </p>
        </div>
      </header>

      <section className="grid two" style={{ marginBottom: 18 }}>
        <form action={addDepartment} className="card form-grid">
          <h2 className="card-title span-full">Create Department</h2>
          <label>
            Name
            <input name="name" required placeholder="Engineering" />
          </label>
          <label>
            Parent
            <select name="parentDepartmentId">
              <option value="">None</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Head
            <select name="headId">
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.email}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Create department</button>
        </form>

        <form action={addCategory} className="card form-grid">
          <h2 className="card-title span-full">Create Asset Category</h2>
          <label>
            Name
            <input name="name" required placeholder="Laptop" />
          </label>
          <label>
            Type
            <input name="type" placeholder="IT equipment" />
          </label>
          <button type="submit">Create category</button>
        </form>
      </section>

      <section className="grid">
        <section className="card">
          <h2 className="card-title">Departments</h2>
          <Table
            headers={["Name", "Status", "Head", "Members"]}
            rows={departments.map((department) => [
              department.name,
              department.status,
              department.head?.name ?? "Unassigned",
              String(department._count.members),
            ])}
          />
        </section>

        <section className="card">
          <h2 className="card-title">Asset Categories</h2>
          <Table
            headers={["Name", "Type", "Status", "Assets"]}
            rows={categories.map((category) => [
              category.name,
              category.type ?? "General",
              category.isActive ? "Active" : "Inactive",
              String(category._count.assets),
            ])}
          />
        </section>

        <section className="card">
          <h2 className="card-title">Employee Directory</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department?.name ?? "Unassigned"}</td>
                    <td>{employee.role}</td>
                    <td>{employee.status}</td>
                    <td>
                      <form action={updateDirectoryRole} className="actions-row">
                        <input type="hidden" name="userId" value={employee.id} />
                        <select name="departmentId" defaultValue={employee.departmentId ?? ""}>
                          <option value="">Unassigned</option>
                          {departments.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                        <select name="role" defaultValue={employee.role}>
                          <option value="EMPLOYEE">Employee</option>
                          <option value="DEPARTMENT_HEAD">Department Head</option>
                          <option value="ASSET_MANAGER">Asset Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <select name="status" defaultValue={employee.status}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                        <button type="submit">Save</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length}>No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
