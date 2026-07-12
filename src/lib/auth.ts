import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "EMPLOYEE", input: false },
      status: { type: "string", defaultValue: "ACTIVE", input: false },
      departmentId: { type: "string", required: false, input: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
