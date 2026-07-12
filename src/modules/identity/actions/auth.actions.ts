"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${origin}/reset-password`,
      },
    });
  } catch {
    // Always show the same message — do not reveal whether the email exists.
  }

  redirect("/forgot-password?sent=1");
}
