"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState(token ? "" : "Reset token is missing.");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await authClient.resetPassword({
      newPassword: String(form.get("password")),
      token,
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Reset failed");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow">AssetFlow</p>
      <h1 className="page-title">Reset password</h1>
      <p className="page-subtitle">Choose a new password for your account.</p>

      <form className="form-grid" onSubmit={onSubmit}>
        <label className="span-full">
          New password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        {error ? (
          <p className="form-error span-full" role="alert">
            {error}
          </p>
        ) : null}
        <button className="span-full" disabled={pending || !token} type="submit">
          {pending ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="auth-links">
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
