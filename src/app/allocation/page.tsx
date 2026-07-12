import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allocateAsset, returnAsset } from "@/features/allocation/actions";
import {
  listActiveAllocations,
  listActiveEmployeesForAllocation,
  listAvailableAssetsForAllocation,
} from "@/features/allocation/queries";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function allocationMessage(code?: string) {
  switch (code) {
    case "allocated":
      return { kind: "success", text: "Asset allocated successfully." };
    case "returned":
      return { kind: "success", text: "Asset returned successfully." };
    default:
      return null;
  }
}

async function createAllocation(formData: FormData) {
  "use server";

  const result = await allocateAsset({
    assetId: String(formData.get("assetId") ?? ""),
    employeeId: String(formData.get("employeeId") ?? ""),
    expectedReturnDate: String(formData.get("expectedReturnDate") ?? ""),
  });

  if (!result.success) {
    redirect(`/allocation?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/allocation");
  revalidatePath("/assets");
  redirect("/allocation?status=allocated");
}

async function closeAllocation(formData: FormData) {
  "use server";

  const result = await returnAsset({
    allocationId: String(formData.get("allocationId") ?? ""),
  });

  if (!result.success) {
    redirect(`/allocation?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/allocation");
  revalidatePath("/assets");
  redirect("/allocation?status=returned");
}

export default async function AllocationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const error = firstParam(params.error);
  const status = firstParam(params.status);
  const message = allocationMessage(status);

  const [assets, employees, allocations] = await Promise.all([
    listAvailableAssetsForAllocation(),
    listActiveEmployeesForAllocation(),
    listActiveAllocations(),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Asset Manager</p>
          <h1 className="page-title">Asset Allocation</h1>
          <p className="page-subtitle">
            Assign available assets to employees and close allocations when assets return.
          </p>
        </div>
      </header>

      {message ? (
        <section className="card" style={{ borderColor: "#1f883d", marginBottom: 18 }}>
          <p style={{ color: "#1f883d", fontWeight: 700, margin: 0 }}>{message.text}</p>
        </section>
      ) : null}

      {error ? (
        <section className="card" style={{ borderColor: "#cf222e", marginBottom: 18 }}>
          <p style={{ color: "#cf222e", fontWeight: 700, margin: 0 }}>{error}</p>
        </section>
      ) : null}

      <section className="grid two" style={{ marginBottom: 18 }}>
        <form action={createAllocation} className="card form-grid">
          <h2 className="card-title span-full">Allocate Asset</h2>
          <label className="span-full">
            Asset
            <select disabled={assets.length === 0} name="assetId" required>
              <option value="">Select available asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} - {asset.name} - {asset.location}
                </option>
              ))}
            </select>
          </label>

          <label className="span-full">
            Employee
            <select disabled={employees.length === 0} name="employeeId" required>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.email}
                  {employee.department?.name ? ` - ${employee.department.name}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Expected Return Date
            <input name="expectedReturnDate" type="date" />
          </label>

          <button
            className="span-full"
            disabled={assets.length === 0 || employees.length === 0}
            type="submit"
          >
            Allocate
          </button>

          {assets.length === 0 ? (
            <p className="muted span-full" style={{ margin: 0 }}>
              No available assets can be allocated right now.
            </p>
          ) : null}
        </form>

        <section className="card">
          <h2 className="card-title">Allocation Rules</h2>
          <div className="list">
            <p className="muted" style={{ margin: 0 }}>
              Only assets with status AVAILABLE can be allocated.
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Assets with active allocations are rejected until they are returned.
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Transfer workflow is intentionally left for the next milestone.
            </p>
          </div>
        </section>
      </section>

      <section className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              Active Allocations
            </h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {allocations.length} active {allocations.length === 1 ? "allocation" : "allocations"}
            </p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No active allocations.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Current Holder</th>
                  <th>Allocation Date</th>
                  <th>Expected Return Date</th>
                  <th>Status</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td>
                      {allocation.asset.assetTag} - {allocation.asset.name}
                    </td>
                    <td>
                      {allocation.employee?.name ??
                        allocation.department?.name ??
                        "Unknown holder"}
                    </td>
                    <td>{allocation.allocatedAt.toLocaleDateString()}</td>
                    <td>
                      {allocation.expectedReturnDate
                        ? allocation.expectedReturnDate.toLocaleDateString()
                        : "Not set"}
                    </td>
                    <td>
                      <span className="status-pill">{allocation.status}</span>
                    </td>
                    <td>
                      <form action={closeAllocation}>
                        <input type="hidden" name="allocationId" value={allocation.id} />
                        <button className="secondary" type="submit">
                          Return
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
