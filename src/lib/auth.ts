import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { getConfiguredSocialProviders } from "@/lib/oauth-providers";
import { rememberPasswordReset } from "@/lib/password-reset-dev";
import { SessionRepository } from "@/modules/identity/repositories/session.repository";
import { ERROR_MESSAGES } from "@/shared/errors/codes";

const socialProviders = getConfiguredSocialProviders();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 15,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      rememberPasswordReset(user.email, url, token);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[password-reset] ${user.email}: ${url}`);
      }
    },
    onPasswordReset: async ({ user }) => {
      await new SessionRepository().deleteByUserId(user.id);
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "EMPLOYEE", input: false },
      status: { type: "string", defaultValue: "ACTIVE", input: false },
      departmentId: { type: "string", required: false, input: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const email = String(ctx.body?.email ?? "")
        .trim()
        .toLowerCase();
      if (!email) return;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { status: true },
      });

      if (user && user.status !== "ACTIVE") {
        throw new APIError("FORBIDDEN", {
          message: ERROR_MESSAGES.AUTH_003,
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/callback/")) return;

      const newSession = ctx.context.newSession;
      if (!newSession) return;

      const user = await prisma.user.findUnique({
        where: { id: newSession.user.id },
        select: { status: true },
      });

      if (user && user.status !== "ACTIVE") {
        await new SessionRepository().deleteByUserId(newSession.user.id);
        throw new APIError("FORBIDDEN", {
          message: ERROR_MESSAGES.AUTH_003,
        });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
