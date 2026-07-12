import { listPendingTransferApprovals } from "@/modules/allocation/actions/transfer.actions";
import { ApprovalsClient } from "./ApprovalsClient";

export default async function TransferApprovalsPage() {
  const transfers = await listPendingTransferApprovals();

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Department approvals</p>
          <h1 className="page-title">Transfer Requests</h1>
          <p className="page-subtitle">Review only requests inside your department scope.</p>
        </div>
      </header>

      <ApprovalsClient transfers={transfers} />
    </main>
  );
}
