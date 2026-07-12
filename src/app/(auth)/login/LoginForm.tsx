"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SocialSignInButtons } from "@/components/SocialSignInButtons";
import { authClient } from "@/lib/auth-client";
import type { OAuthProvider } from "@/lib/oauth-providers";

type LoginFormProps = {
  oauthProviders: OAuthProvider[];
};

export function LoginForm({ oauthProviders }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Invalid credentials");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow">AssetFlow</p>
      <h1 className="page-title">Sign in</h1>
      <p className="page-subtitle">Use your organization account to continue.</p>

      <form className="form-grid" onSubmit={onSubmit}>
        <SocialSignInButtons providers={oauthProviders} />

        <label className="span-full">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="span-full">
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error ? (
          <p className="form-error span-full" role="alert">
            {error}
          </p>
        ) : null}
        <button className="span-full" disabled={pending} type="submit">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-links">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/signup">Create account</Link>
      </p>
    </>
  );
}
