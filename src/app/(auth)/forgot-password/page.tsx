import Link from "next/link";
import { requestPasswordReset } from "@/modules/identity/actions/auth.actions";

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="eyebrow">AssetFlow</p>
      <h1 className="page-title">Forgot password</h1>
      <p className="page-subtitle">We will email a reset link when the account exists.</p>

      <form action={requestPasswordReset} className="form-grid">
        <label className="span-full">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <button className="span-full" type="submit">
          Send reset link
        </button>
      </form>

      <p className="auth-links">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
