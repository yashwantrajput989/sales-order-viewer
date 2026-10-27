// Signed-cookie sessions for app users (no database needed).
import crypto from "node:crypto";
import type { Request, Response } from "express";

export interface Session {
  user: { name: string; email: string };
  context: Record<string, string>;
  exp: number;
}

const COOKIE = "app_session";
const TTL_MS = 12 * 60 * 60 * 1000;

let secret = (process.env.SESSION_SECRET || "").trim();
export function initSessionSecret() {
  secret = (process.env.SESSION_SECRET || "").trim();
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    console.warn("SESSION_SECRET is not set - using a random secret (users are signed out on every restart).");
  }
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function readSession(req: Request): Session | null {
  const raw = String(req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, mac] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function writeSession(res: Response, session: Omit<Session, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + TTL_MS })).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", COOKIE + "=" + payload + "." + sign(payload) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + TTL_MS / 1000 + secure);
}

export function clearSession(res: Response) {
  res.setHeader("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}
