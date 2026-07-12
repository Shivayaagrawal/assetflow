export const OAUTH_PROVIDER_KEYS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDER_KEYS)[number];

const providerEnv = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
} as const satisfies Record<
  OAuthProvider,
  { clientId: string | undefined; clientSecret: string | undefined }
>;

export function getConfiguredSocialProviders() {
  const socialProviders: {
    google?: {
      clientId: string;
      clientSecret: string;
      prompt: "select_account";
    };
    github?: {
      clientId: string;
      clientSecret: string;
      scope: ["user:email"];
    };
  } = {};

  const google = providerEnv.google;
  if (google.clientId && google.clientSecret) {
    socialProviders.google = {
      clientId: google.clientId,
      clientSecret: google.clientSecret,
      prompt: "select_account",
    };
  }

  const github = providerEnv.github;
  if (github.clientId && github.clientSecret) {
    socialProviders.github = {
      clientId: github.clientId,
      clientSecret: github.clientSecret,
      scope: ["user:email"],
    };
  }

  return socialProviders;
}

export function enabledOAuthProviders(): OAuthProvider[] {
  return OAUTH_PROVIDER_KEYS.filter((provider) => {
    const creds = providerEnv[provider];
    return Boolean(creds.clientId && creds.clientSecret);
  });
}

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};
