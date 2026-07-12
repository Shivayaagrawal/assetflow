import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">AssetFlow</p>
          <h1 className="page-title">Enterprise Asset &amp; Resource Management</h1>
          <p className="page-subtitle">
            Odoo Hackathon 2026 — sign in to access the operations console.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="actions-row">
          <Link className="button" href="/login">
            Sign in
          </Link>
          <Link className="button secondary" href="/signup">
            Create account
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          New accounts are created as employees. Admin roles are assigned later in Organization Setup.
        </p>
      </section>
    </main>
  );
}
