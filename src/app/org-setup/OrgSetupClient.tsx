"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAssetCategory,
  createDepartment,
  deactivateDepartment,
} from "@/modules/organization/actions/organization.actions";
import { DepartmentSelect } from "@/components/DepartmentSelect";
import { updateEmployeeRole } from "@/modules/identity/actions/identity.actions";

type Department = {
  id: string;
  name: string;
  status: string;
  parentId: string | null;
  head: { id: string; name: string; email: string } | null;
  _count: { members: number; children: number; allocations: number };
};

type Category = {
  id: string;
  name: string;
  customFields: unknown;
  _count: { assets: number };
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER" | "ADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  departmentId: string | null;
  department: { id: string; name: string } | null;
  createdAt: Date;
};

type Message = { kind: "success" | "error"; text: string } | null;

function friendlyError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const msg = error.message;
  if (msg === "ORG_001") return "Department not found or cannot be its own parent.";
  if (msg === "ORG_002") return "A Department Head must be assigned to a department.";
  if (msg === "ORG_003") return "This department still has active employees and cannot be deactivated.";
  if (msg === "ORG_004") return "Cannot deactivate a category with active assets.";
  if (msg === "ORG_005") return "Cannot remove the last admin account.";
  if (msg === "ORG_006") return "Employee not found.";
  if (msg === "FORBIDDEN") return "You do not have permission to perform this action.";
  if (msg === "UNAUTHORIZED") return "Your session expired. Sign in again and retry.";
  if (msg === "AUTH_007") return "You do not have permission to perform this action.";
  if (msg === "AUTH_002") return "Your session expired. Sign in again and retry.";
  if (msg === "AUTH_003") return "Your account is inactive or suspended.";
  if (msg === "GEN_001") return "Validation failed. Check your inputs and try again.";
  return msg || "Something went wrong. Try again.";
}

export function OrgSetupClient({
  departments,
  categories,
  employees,
}: {
  departments: Department[];
  categories: Category[];
  employees: Employee[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<unknown>, successText: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage({ kind: "success", text: successText });
        router.refresh();
      } catch (error) {
        setMessage({ kind: "error", text: friendlyError(error) });
      }
    });
  }

  return (
    <>
      {message && (
        <div className={`notice ${message.kind}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <section className="grid two" style={{ marginBottom: 18 }}>
        <form
          action={(formData) =>
            runAction(
              () =>
                createDepartment({
                  name: String(formData.get("name")),
                  parentDepartmentId:
                    String(formData.get("parentDepartmentId") || "") || null,
                  headId: String(formData.get("headId") || "") || null,
                }),
              "Department created successfully."
            )
          }
          className="card form-grid"
        >
          <h2 className="card-title span-full">Create Department</h2>
          <label>
            Name
            <input disabled={isPending} name="name" required placeholder="Engineering" />
          </label>
          <label>
            Parent
            <DepartmentSelect
              departments={departments}
              disabled={isPending}
              includeEmpty
              name="parentDepartmentId"
              placeholder="None"
            />
          </label>
          <label>
            Head
            <select disabled={isPending} name="headId">
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} — {e.email}</option>
              ))}
            </select>
          </label>
          <button disabled={isPending} type="submit">
            {isPending ? "Creating…" : "Create department"}
          </button>
        </form>

        <form
          action={(formData) =>
            runAction(
              () =>
                createAssetCategory({
                  name: String(formData.get("name")),
                }),
              "Asset category created and available to asset registration."
            )
          }
          className="card form-grid"
        >
          <h2 className="card-title span-full">Create Asset Category</h2>
          <label>
            Name
            <input disabled={isPending} name="name" required placeholder="Laptop" />
          </label>
          <button disabled={isPending} type="submit">
            {isPending ? "Creating…" : "Create category"}
          </button>
        </form>
      </section>

      <section className="grid">
        <section className="card">
          <h2 className="card-title">Departments</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Head</th>
                  <th>Members</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>
                      <span className="status-pill">{d.status}</span>
                    </td>
                    <td>{d.head?.name ?? "Unassigned"}</td>
                    <td>{d._count.members}</td>
                    <td>
                      {d.status === "ACTIVE" ? (
                        <button
                          disabled={isPending}
                          className="danger secondary"
                          style={{ minHeight: 28, padding: "0 8px", fontSize: 12 }}
                          onClick={() =>
                            runAction(
                              () => deactivateDepartment(d.id),
                              `Department ${d.name} deactivated.`
                            )
                          }
                          type="button"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>Disabled</span>
                      )}
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={5}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Asset Categories</h2>
          <Table
            headers={["Name", "Assets"]}
            rows={categories.map((c) => [
              c.name,
              String(c._count.assets),
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
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department?.name ?? "Unassigned"}</td>
                    <td>{emp.role}</td>
                    <td>{emp.status}</td>
                    <td>
                      <form
                        action={(formData) =>
                          runAction(
                            () =>
                              updateEmployeeRole({
                                userId: String(formData.get("userId")),
                                role: formData.get("role") as Employee["role"],
                                departmentId:
                                  String(formData.get("departmentId") || "") || null,
                                status: formData.get("status") as Employee["status"],
                              }),
                            `Updated ${emp.name}.`
                          )
                        }
                        className="actions-row"
                      >
                        <input type="hidden" name="userId" value={emp.id} />
                        <DepartmentSelect
                          defaultValue={emp.departmentId ?? ""}
                          departments={departments}
                          disabled={isPending}
                          includeEmpty
                          name="departmentId"
                          placeholder="Unassigned"
                        />
                        <select disabled={isPending} name="role" defaultValue={emp.role}>
                          <option value="EMPLOYEE">Employee</option>
                          <option value="DEPARTMENT_HEAD">Department Head</option>
                          <option value="ASSET_MANAGER">Asset Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <select disabled={isPending} name="status" defaultValue={emp.status}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                        <button disabled={isPending} type="submit">
                          {isPending ? "Saving…" : "Save"}
                        </button>
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
    </>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.join("|") + i}>
              {row.map((cell, j) => (
                <td key={`${j}-${cell}`}>{cell}</td>
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
