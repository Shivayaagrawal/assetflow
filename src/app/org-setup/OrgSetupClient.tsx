"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAssetCategory,
  createDepartment,
  deactivateCategory,
  deactivateDepartment,
  updateAssetCategory,
  updateDepartment,
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
type Tab = "departments" | "categories" | "employees";

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

function parseCustomFields(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as unknown;
}

function formatCustomFields(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
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
  const [activeTab, setActiveTab] = useState<Tab>("departments");
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  function runAction(action: () => Promise<unknown>, successText: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage({ kind: "success", text: successText });
        setEditingDepartmentId(null);
        setEditingCategoryId(null);
        router.refresh();
      } catch (error) {
        setMessage({ kind: "error", text: friendlyError(error) });
      }
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "departments", label: "Departments" },
    { id: "categories", label: "Asset Categories" },
    { id: "employees", label: "Employee Directory" },
  ];

  return (
    <>
      {message && (
        <div className={`notice ${message.kind}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <nav aria-label="Organization setup sections" className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "departments" && (
        <section className="tab-panel">
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
              Parent Department
              <DepartmentSelect
                departments={departments}
                disabled={isPending}
                includeEmpty
                name="parentDepartmentId"
                placeholder="None"
              />
            </label>
            <label>
              Department Head
              <select disabled={isPending} name="headId">
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.email}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={isPending} type="submit">
              {isPending ? "Creating…" : "Create department"}
            </button>
          </form>

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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <Fragment key={d.id}>
                      <tr key={d.id}>
                        <td>{d.name}</td>
                        <td>
                          <span className="status-pill">{d.status}</span>
                        </td>
                        <td>{d.head?.name ?? "Unassigned"}</td>
                        <td>{d._count.members}</td>
                        <td>
                          <div className="actions-row">
                            {d.status === "ACTIVE" && (
                              <>
                                <button
                                  className="secondary"
                                  disabled={isPending}
                                  onClick={() =>
                                    setEditingDepartmentId(
                                      editingDepartmentId === d.id ? null : d.id
                                    )
                                  }
                                  style={{ minHeight: 28, padding: "0 8px", fontSize: 12 }}
                                  type="button"
                                >
                                  Edit
                                </button>
                                <button
                                  className="danger secondary"
                                  disabled={isPending}
                                  onClick={() =>
                                    runAction(
                                      () => deactivateDepartment(d.id),
                                      `Department ${d.name} deactivated.`
                                    )
                                  }
                                  style={{ minHeight: 28, padding: "0 8px", fontSize: 12 }}
                                  type="button"
                                >
                                  Deactivate
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {editingDepartmentId === d.id && (
                        <tr className="inline-form-row" key={`${d.id}-edit`}>
                          <td colSpan={5}>
                            <form
                              action={(formData) =>
                                runAction(
                                  () =>
                                    updateDepartment(d.id, {
                                      name: String(formData.get("name")),
                                      parentDepartmentId:
                                        String(formData.get("parentDepartmentId") || "") ||
                                        null,
                                      headId: String(formData.get("headId") || "") || null,
                                    }),
                                  `Department ${d.name} updated.`
                                )
                              }
                              className="form-grid"
                              style={{ gridTemplateColumns: "repeat(3, 1fr) auto" }}
                            >
                              <label>
                                Name
                                <input
                                  defaultValue={d.name}
                                  disabled={isPending}
                                  name="name"
                                  required
                                />
                              </label>
                              <label>
                                Parent
                                <DepartmentSelect
                                  defaultValue={d.parentId ?? ""}
                                  departments={departments.filter((dept) => dept.id !== d.id)}
                                  disabled={isPending}
                                  includeEmpty
                                  name="parentDepartmentId"
                                  placeholder="None"
                                />
                              </label>
                              <label>
                                Head
                                <select
                                  defaultValue={d.head?.id ?? ""}
                                  disabled={isPending}
                                  name="headId"
                                >
                                  <option value="">Unassigned</option>
                                  {employees.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="actions-row" style={{ alignSelf: "end" }}>
                                <button disabled={isPending} type="submit">
                                  Save
                                </button>
                                <button
                                  className="secondary"
                                  onClick={() => setEditingDepartmentId(null)}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={5}>No departments yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === "categories" && (
        <section className="tab-panel">
          <form
            action={(formData) => {
              let customFields: unknown | null = null;
              try {
                customFields = parseCustomFields(String(formData.get("customFields") || ""));
              } catch {
                setMessage({
                  kind: "error",
                  text: "Custom fields must be valid JSON (e.g. {\"warrantyMonths\": 12}).",
                });
                return;
              }
              runAction(
                () =>
                  createAssetCategory({
                    name: String(formData.get("name")),
                    customFields,
                  }),
                "Asset category created."
              );
            }}
            className="card form-grid"
          >
            <h2 className="card-title span-full">Create Asset Category</h2>
            <label>
              Name
              <input disabled={isPending} name="name" required placeholder="Electronics" />
            </label>
            <label className="span-full">
              Custom fields (optional JSON)
              <textarea
                disabled={isPending}
                name="customFields"
                placeholder='{"warrantyMonths": 12, "requiresSerial": true}'
                rows={3}
              />
            </label>
            <button className="span-full" disabled={isPending} type="submit">
              {isPending ? "Creating…" : "Create category"}
            </button>
          </form>

          <section className="card">
            <h2 className="card-title">Asset Categories</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Assets</th>
                    <th>Custom fields</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <Fragment key={c.id}>
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c._count.assets}</td>
                        <td>
                          <code style={{ fontSize: 12 }}>
                            {c.customFields
                              ? formatCustomFields(c.customFields)
                              : "—"}
                          </code>
                        </td>
                        <td>
                          <div className="actions-row">
                            <button
                              className="secondary"
                              disabled={isPending}
                              onClick={() =>
                                setEditingCategoryId(
                                  editingCategoryId === c.id ? null : c.id
                                )
                              }
                              style={{ minHeight: 28, padding: "0 8px", fontSize: 12 }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="danger secondary"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () => deactivateCategory(c.id),
                                  `Category ${c.name} deactivated.`
                                )
                              }
                              style={{ minHeight: 28, padding: "0 8px", fontSize: 12 }}
                              type="button"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingCategoryId === c.id && (
                        <tr className="inline-form-row" key={`${c.id}-edit`}>
                          <td colSpan={4}>
                            <form
                              action={(formData) => {
                                let customFields: unknown | null = null;
                                try {
                                  customFields = parseCustomFields(
                                    String(formData.get("customFields") || "")
                                  );
                                } catch {
                                  setMessage({
                                    kind: "error",
                                    text: "Custom fields must be valid JSON.",
                                  });
                                  return;
                                }
                                runAction(
                                  () =>
                                    updateAssetCategory(c.id, {
                                      name: String(formData.get("name")),
                                      customFields,
                                    }),
                                  `Category ${c.name} updated.`
                                );
                              }}
                              className="form-grid"
                            >
                              <label>
                                Name
                                <input
                                  defaultValue={c.name}
                                  disabled={isPending}
                                  name="name"
                                  required
                                />
                              </label>
                              <label className="span-full">
                                Custom fields (JSON)
                                <textarea
                                  defaultValue={formatCustomFields(c.customFields)}
                                  disabled={isPending}
                                  name="customFields"
                                  rows={3}
                                />
                              </label>
                              <div className="actions-row">
                                <button disabled={isPending} type="submit">
                                  Save
                                </button>
                                <button
                                  className="secondary"
                                  onClick={() => setEditingCategoryId(null)}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4}>No categories yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === "employees" && (
        <section className="tab-panel">
          <section className="card">
            <h2 className="card-title">Employee Directory</h2>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              Promote employees to Department Head or Asset Manager here. Signup always creates
              Employee accounts.
            </p>
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
                      <td colSpan={6}>No employees yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}
    </>
  );
}
