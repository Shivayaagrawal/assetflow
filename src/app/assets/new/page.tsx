import { AssetCondition } from "@prisma/client";
import { getAssetRegistrationCategories } from "@/features/assets/queries";
import { requireRole } from "@/lib/session";
import { AssetRegistrationForm } from "./AssetRegistrationForm";

export default async function NewAssetPage() {
  try {
    await requireRole("ASSET_MANAGER");
  } catch {
    return (
      <main style={{ minHeight: "100vh", background: "#f7f8fa", padding: "32px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #dfe4ea",
            borderRadius: "8px",
            margin: "0 auto",
            maxWidth: "720px",
            padding: "24px",
          }}
        >
          <p style={{ color: "#b42318", fontWeight: 700, margin: "0 0 8px" }}>
            Access denied
          </p>
          <h1 style={{ color: "#17202a", fontSize: "28px", margin: "0 0 8px" }}>
            Asset Registration
          </h1>
          <p style={{ color: "#5f6b7a", margin: 0 }}>
            Only Asset Managers can register assets.
          </p>
        </div>
      </main>
    );
  }

  const categories = await getAssetRegistrationCategories();
  const conditionOptions = Object.values(AssetCondition);

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
        <AssetRegistrationForm
          categories={categories}
          conditionOptions={conditionOptions}
        />
      </div>
    </main>
  );
}
