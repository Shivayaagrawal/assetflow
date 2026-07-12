import { SignupForm } from "./SignupForm";
import { enabledOAuthProviders } from "@/lib/oauth-providers";

export default function SignupPage() {
  return <SignupForm oauthProviders={enabledOAuthProviders()} />;
}
