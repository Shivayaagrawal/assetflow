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

  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: `${origin}/reset-password`,
    },
  });
}
