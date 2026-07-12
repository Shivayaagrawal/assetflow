import { getAssetRegistrationCategories } from "@/modules/asset/queries/asset.queries";
import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import { listDepartments } from "@/modules/organization/queries/organization.queries";
import { AccessDenied } from "@/components/AccessDenied";
import { requireSessionUser } from "@/shared/auth/session";
import { AssetRegistrationForm } from "./AssetRegistrationForm";

export default async function NewAssetPage() {
  const user = await requireSessionUser();

  if (!AssetPolicy.canRegister(user)) {
    return (
      <AccessDenied
        currentRole={user.role}
        message="Only asset managers and administrators can register assets. Ask an admin to promote your account in Organization Setup."
        requiredRoles={["ASSET_MANAGER", "ADMIN"]}
        title="Asset Registration"
      />
    );
  }

  const [categories, departments] = await Promise.all([
    getAssetRegistrationCategories(),
    listDepartments({ activeOnly: true }),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "32px" }}>
      <div style={{ margin: "0 auto", maxWidth: "880px" }}>
        <div style={{ marginBottom: "24px" }}>
          <p style={{ color: "#5f6b7a", fontSize: "14px", margin: "0 0 8px" }}>
            Asset Manager
          </p>
          <h1 style={{ color: "#17202a", fontSize: "32px", margin: 0 }}>
            Register Asset
          </h1>
        </div>
        <AssetRegistrationForm categories={categories} departments={departments} />
      </div>
    </main>
  );
}
