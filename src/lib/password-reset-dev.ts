/** Dev/e2e hook — stores last reset URL per email when no mail provider is configured. */
const store = new Map<string, { token: string; url: string }>();

export function rememberPasswordReset(email: string, url: string, token: string) {
  store.set(email.trim().toLowerCase(), { token, url });
}

export function getPasswordResetToken(email: string) {
  return store.get(email.trim().toLowerCase());
}
