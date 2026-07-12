import { LoginForm } from "./LoginForm";
import { enabledOAuthProviders } from "@/lib/oauth-providers";

export default function LoginPage() {
  return <LoginForm oauthProviders={enabledOAuthProviders()} />;
}
