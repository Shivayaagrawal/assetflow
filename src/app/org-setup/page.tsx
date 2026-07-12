import {
  listAssetCategories,
  listDepartments,
  listEmployeeDirectory,
} from "@/features/org-setup/queries";

const page = {
  fontFamily: "system-ui, sans-serif",
  margin: "0 auto",
  maxWidth: "1180px",
  padding: "32px",
};

const card = {
  border: "1px solid #d8dee4",
  borderRadius: "8px",
  padding: "18px",
  background: "#fff",
};

export default async function OrgSetupPage() {
  const [departments, categories, employees] = await Promise.all([
    listDepartments(),
    listAssetCategories(),
    listEmployeeDirectory(),
  ]);

  return (
    <main style={page}>
      <header style={{ marginBottom: "24px" }}>
        <p style={{ color: "#57606a", margin: 0 }}>Administration</p>
        <h1 style={{ margin: "4px 0" }}>Organization Setup</h1>
      </header>

      <section style={{ display: "grid", gap: "18px" }}>
        <section style={card}>
          <h2 style={{ fontSize: "18px", marginTop: 0 }}>Departments</h2>
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

        <section style={card}>
          <h2 style={{ fontSize: "18px", marginTop: 0 }}>Asset Categories</h2>
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

        <section style={card}>
          <h2 style={{ fontSize: "18px", marginTop: 0 }}>Employee Directory</h2>
          <Table
            headers={["Name", "Email", "Department", "Role", "Status"]}
            rows={employees.map((employee) => [
              employee.name,
              employee.email,
              employee.department?.name ?? "Unassigned",
              employee.role,
              employee.status,
            ])}
          />
        </section>
      </section>
    </main>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth: "720px", width: "100%" }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={cellHead}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} style={cellBody}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} style={cellBody}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const cellHead = {
  borderBottom: "1px solid #d8dee4",
  color: "#57606a",
  fontSize: "13px",
  padding: "10px",
  textAlign: "left" as const,
};

const cellBody = {
  borderBottom: "1px solid #d8dee4",
  padding: "10px",
  textAlign: "left" as const,
};
