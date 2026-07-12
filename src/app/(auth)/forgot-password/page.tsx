import Link from "next/link";
import { requestPasswordReset } from "@/modules/identity/actions/auth.actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ sent?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { sent } = await searchParams;
  const submitted = sent === "1";

  return (
    <>
      <p className="eyebrow">AssetFlow</p>
      <h1 className="page-title">Forgot password</h1>
      <p className="page-subtitle">
        {submitted
          ? "If an account exists for that email, a reset link has been sent."
          : "Enter your email and we will send a reset link when the account exists."}
      </p>

      {submitted ? (
        <p className="form-success span-full" role="status">
          Check your inbox. In local development, the reset URL is also printed in the server
          console.
        </p>
      ) : (
        <form action={requestPasswordReset} className="form-grid">
          <label className="span-full">
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button className="span-full" type="submit">
            Send reset link
          </button>
        </form>
      )}

      <p className="auth-links">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
