import {
  listAssetCategories,
  listDepartments,
  listEmployeeDirectory,
} from "@/features/org-setup/queries";
import { OrgSetupClient } from "./OrgSetupClient";

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

      <OrgSetupClient
        departments={departments}
        categories={categories}
        employees={employees}
      />
    </main>
  );
}
