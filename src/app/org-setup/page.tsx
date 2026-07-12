import {
  listAssetCategories,
  listDepartments,
  listEmployeeDirectory,
} from "@/modules/organization/queries/organization.queries";
import { AccessDenied } from "@/components/AccessDenied";
import { requireSessionUser } from "@/shared/auth/session";
import { OrgSetupClient } from "./OrgSetupClient";

export default async function OrgSetupPage() {
  const user = await requireSessionUser();

  if (user.role !== "ADMIN") {
    return (
      <AccessDenied
        message="Organization setup is restricted to administrators. Sign in with an admin account or ask an admin to update your role."
        title="Organization Setup"
      />
    );
  }

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
