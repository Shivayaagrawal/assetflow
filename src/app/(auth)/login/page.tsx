import { LoginForm } from "./LoginForm";
import { enabledOAuthProviders } from "@/lib/oauth-providers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ expired?: string; inactive?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const notice = params.expired
    ? "Your session expired. Sign in again to continue."
    : params.inactive
      ? "Your account is inactive. Contact an administrator."
      : null;

  return <LoginForm notice={notice} oauthProviders={enabledOAuthProviders()} />;
}
