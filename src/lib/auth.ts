import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApiKeyByKey } from "./db";

type AuthResult = {
  authenticated: true;
  source: "session" | "apikey";
  userId?: string;
  role?: string;
  permissions?: string[];
} | {
  authenticated: false;
  response: NextResponse;
};

const unauthorized = (message = "Unauthorized") =>
  NextResponse.json({ error: message }, { status: 401 });

const forbidden = (message = "Forbidden") =>
  NextResponse.json({ error: message }, { status: 403 });

export async function authenticateSession(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { authenticated: false, response: unauthorized() };
  }
  return {
    authenticated: true,
    source: "session",
    userId: session.user.id,
    role: (session.user as { role?: string }).role,
  };
}

export async function authenticateApiKey(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { authenticated: false, response: unauthorized("Missing API key") };
  }

  const key = header.slice(7);
  const apiKey = await getApiKeyByKey(key);

  if (!apiKey) {
    return { authenticated: false, response: unauthorized("Invalid API key") };
  }

  const permissions = JSON.parse(apiKey.permissions as string) as string[];
  return { authenticated: true, source: "apikey", permissions };
}

export async function authenticateAny(req: NextRequest): Promise<AuthResult> {
  const session = await auth();
  if (session?.user) {
    return {
      authenticated: true,
      source: "session",
      userId: session.user.id,
      role: (session.user as { role?: string }).role,
    };
  }
  return authenticateApiKey(req);
}

export function requirePermission(authResult: AuthResult & { authenticated: true }, permission: string): NextResponse | null {
  if (authResult.source === "session") return null;
  if (authResult.permissions?.includes(permission)) return null;
  return forbidden(`Missing permission: ${permission}`);
}
