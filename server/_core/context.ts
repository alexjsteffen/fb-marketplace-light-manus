import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

// Dev bypass user — used when OAuth is not configured (local development)
const DEV_USER: User = {
  id: 1,
  openId: "dev-user",
  name: "Dev User",
  email: "dev@localhost",
  loginMethod: "dev",
  role: "admin",
  dealerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // If OAuth is not configured (local dev), use a dev bypass user
  if (!user && !ENV.oAuthServerUrl) {
    user = DEV_USER;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
