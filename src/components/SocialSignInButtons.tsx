"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  OAUTH_PROVIDER_LABELS,
  type OAuthProvider,
} from "@/lib/oauth-providers";

type SocialSignInButtonsProps = {
  providers: OAuthProvider[];
  callbackURL?: string;
};

export function SocialSignInButtons({
  providers,
  callbackURL = "/dashboard",
}: SocialSignInButtonsProps) {
  const [error, setError] = useState("");
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );

  if (providers.length === 0) return null;

  async function signInWith(provider: OAuthProvider) {
    setPendingProvider(provider);
    setError("");

    const result = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: "/login",
    });

    setPendingProvider(null);

    if (result.error) {
      setError(result.error.message ?? "OAuth sign-in failed");
    }
  }

  return (
    <div className="oauth-section span-full">
      <div className="oauth-divider" role="presentation">
        <span>or continue with</span>
      </div>

      <div className="oauth-buttons">
        {providers.map((provider) => (
          <button
            key={provider}
            className="oauth-button"
            disabled={pendingProvider !== null}
            onClick={() => signInWith(provider)}
            type="button"
          >
            {pendingProvider === provider
              ? "Redirecting..."
              : OAUTH_PROVIDER_LABELS[provider]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
