import { listPendingTransferApprovals } from "@/modules/allocation/actions/transfer.actions";
import { AccessDenied } from "@/components/AccessDenied";
import { requireSessionUser } from "@/shared/auth/session";
import { ApprovalsClient } from "./ApprovalsClient";

export default async function TransferApprovalsPage() {
  const user = await requireSessionUser();

  if (
    user.role !== "DEPARTMENT_HEAD" &&
    user.role !== "ASSET_MANAGER" &&
    user.role !== "ADMIN"
  ) {
    return (
      <AccessDenied
        message="Transfer approvals are limited to department heads, asset managers, and administrators."
        title="Transfer Requests"
      />
    );
  }

  if (user.role === "DEPARTMENT_HEAD" && !user.departmentId) {
    return (
      <AccessDenied
        message="Your account is not assigned to a department. Ask an administrator to assign you in Organization Setup."
        title="Transfer Requests"
      />
    );
  }

  const transfers = await listPendingTransferApprovals();
  const subtitle =
    user.role === "DEPARTMENT_HEAD"
      ? "Review transfer requests inside your department scope."
      : "Review all pending transfer requests across the organization.";

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Department approvals</p>
          <h1 className="page-title">Transfer Requests</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </header>

      <ApprovalsClient transfers={transfers} />
    </main>
  );
}
