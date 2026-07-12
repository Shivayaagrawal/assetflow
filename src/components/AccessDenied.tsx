import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { ROLE_LABELS } from "@/shared/navigation/nav-config";

type AccessDeniedProps = {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
  currentRole?: UserRole;
  requiredRoles?: UserRole[];
};

export function AccessDenied({
  title,
  message,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  currentRole,
  requiredRoles,
}: AccessDeniedProps) {
  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Access denied</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{message}</p>
        {currentRole ? (
          <p className="muted" style={{ margin: "0 0 16px" }}>
            Signed in as <strong>{ROLE_LABELS[currentRole]}</strong>
            {requiredRoles && requiredRoles.length > 0
              ? ` · requires ${requiredRoles.map((role) => ROLE_LABELS[role]).join(" or ")}`
              : ""}
          </p>
        ) : null}
        <Link className="button secondary" href={backHref}>
          {backLabel}
        </Link>
      </section>
    </main>
  );
}
