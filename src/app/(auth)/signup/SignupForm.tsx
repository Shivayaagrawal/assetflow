"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SocialSignInButtons } from "@/components/SocialSignInButtons";
import { authClient } from "@/lib/auth-client";
import type { OAuthProvider } from "@/lib/oauth-providers";

type SignupFormProps = {
  oauthProviders: OAuthProvider[];
};

export function SignupForm({ oauthProviders }: SignupFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      name: String(form.get("name")),
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Signup failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow">AssetFlow</p>
      <h1 className="page-title">Create account</h1>
      <p className="page-subtitle">New accounts are created as employees.</p>

      <form className="form-grid" onSubmit={onSubmit}>
        <SocialSignInButtons providers={oauthProviders} />

        <label className="span-full">
          Full name
          <input name="name" required autoComplete="name" />
        </label>
        <label className="span-full">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="span-full">
          Password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        {error ? (
          <p className="form-error span-full" role="alert">
            {error}
          </p>
        ) : null}
        <button className="span-full" disabled={pending} type="submit">
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-links">
        <Link href="/login">Already have an account?</Link>
      </p>
    </>
  );
}
