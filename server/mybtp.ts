// MyBTP AI client. Every SAP call made by this app goes through your MyBTP AI hub:
//   POST {MYBTPAI_BASE_URL}/api/v1/oauth/token    -> app token (cached, refreshed automatically)
//   POST {MYBTPAI_BASE_URL}/api/v1/gateway/invoke -> SAP OData / REST call (credentials, CSRF handled by the hub)
// Credentials stay on the server (see .env). The browser only talks to this app's /api/*.
import fs from "node:fs";

export interface FieldConfig {
  name: string;
  type: string;
  isKey: boolean;
  editable: boolean;
}

export interface EntityConfig {
  key: string;
  label: string;
  apiId: string;
  entitySet: string;
  keys: string[];
  fields: FieldConfig[];
}

export type ValueSource =
  | { kind: "literal"; value: string }
  | { kind: "context"; name: string }
  | { kind: "param"; name: string }
  | { kind: "field"; name: string };

export interface QueryConfig {
  screenId: string;
  entityKey: string;
  params: string[];
  filters: { field: string; operator: "eq" | "ne" | "gt" | "ge" | "lt" | "le"; value: ValueSource }[];
  select: string[];
  top: number;
}

export interface ActionConfig {
  id: string;
  label: string;
  apiId: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  params: { name: string; value: ValueSource }[];
  successMessage: string;
  resultField?: string;
}

export interface ContextVarConfig {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
  required: boolean;
}

interface AppConfig {
  appName: string;
  signIn: "mybtp" | "none";
  contextVars: ContextVarConfig[];
  entities: EntityConfig[];
  queries: QueryConfig[];
  actions: ActionConfig[];
}

export const appConfig: AppConfig = JSON.parse(
  fs.readFileSync(new URL("../mybtp.config.json", import.meta.url), "utf8"),
);

export class MyBtpError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function settings() {
  return {
    baseUrl: env("MYBTPAI_BASE_URL").replace(/\/+$/, ""),
    // Recommended: an app key from MyBTP AI > Connected Apps (scopes read:catalog, invoke:gateway).
    clientId: env("MYBTPAI_CLIENT_ID"),
    clientSecret: env("MYBTPAI_CLIENT_SECRET"),
    // Alternative: a MyBTP AI user account.
    email: env("MYBTPAI_EMAIL"),
    password: env("MYBTPAI_PASSWORD"),
    appName: env("MYBTPAI_APP_NAME") || appConfig.appName,
  };
}

export function isConfigured(): boolean {
  const s = settings();
  return Boolean(s.baseUrl && ((s.clientId && s.clientSecret) || (s.email && s.password)));
}

/** Reads { error, error_code } from a MyBTP AI error response. */
async function hubError(res: Response): Promise<{ message: string; code: string }> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text);
    return { message: typeof body.error === "string" ? body.error : body.message || text, code: body.error_code || "" };
  } catch {
    return { message: text.slice(0, 300) || res.statusText, code: "" };
  }
}

let cachedToken = "";
let tokenExpiresAt = 0;

function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    // Not a JWT we can read: fall back to one hour.
  }
  return Date.now() + 60 * 60 * 1000;
}

async function login(): Promise<string> {
  const s = settings();
  if (!isConfigured()) {
    throw new MyBtpError(
      "MyBTP AI is not configured. Set MYBTPAI_BASE_URL and MYBTPAI_CLIENT_ID/MYBTPAI_CLIENT_SECRET (or MYBTPAI_EMAIL/MYBTPAI_PASSWORD) in .env",
      500,
    );
  }
  const useAppKey = Boolean(s.clientId && s.clientSecret);
  const res = await fetch(s.baseUrl + (useAppKey ? "/api/v1/oauth/token" : "/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(useAppKey ? { client_id: s.clientId, client_secret: s.clientSecret } : { email: s.email, password: s.password }),
  });
  if (!res.ok) {
    const err = await hubError(res);
    throw new MyBtpError("MyBTP AI rejected this app's credentials (" + res.status + "): " + err.message, 502);
  }
  const data = await res.json();
  const token = data.token || data.access_token || (data.data && data.data.token);
  if (!token) throw new MyBtpError("MyBTP AI login returned no token", 502);
  cachedToken = token;
  tokenExpiresAt = jwtExpiry(token);
  return token;
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && tokenExpiresAt > Date.now() + 60000) return cachedToken;
  return login();
}

/**
 * Verifies an app user's MyBTP AI account (used for signing in to this app).
 * Returns the user's display name and email, or throws when the hub rejects the credentials.
 */
export async function verifyHubUser(email: string, password: string): Promise<{ name: string; email: string }> {
  const s = settings();
  if (!s.baseUrl) throw new MyBtpError("MYBTPAI_BASE_URL is not configured", 500);
  const res = await fetch(s.baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await hubError(res);
    throw new MyBtpError(err.message || "Incorrect email or password", res.status === 403 ? 403 : 401);
  }
  const data = await res.json();
  const user = data.user || {};
  return { name: String(user.name || user.email || email), email: String(user.email || email) };
}

/** OData needs spaces encoded as %20 (URLSearchParams would use "+", which SAP rejects). */
function rawQuery(params: Record<string, string | number>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => k + "=" + encodeURIComponent(String(v)))
    .join("&");
}

/** Normalises OData v2 (d.results), v4 (value) and plain-array payloads into rows. */
export function extractRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, any>;
  if (obj.data !== undefined && obj.data !== data) return extractRows(obj.data);
  if (Array.isArray(obj.value)) return obj.value;
  if (obj.d) {
    if (Array.isArray(obj.d.results)) return obj.d.results;
    if (Array.isArray(obj.d)) return obj.d;
    return [obj.d];
  }
  return [obj];
}

export async function invoke(request: {
  apiId: string;
  entitySet?: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number>;
  keyOrPath?: string;
  payload?: unknown;
}): Promise<unknown> {
  const s = settings();
  const query = request.query || {};
  // Paths are relative to the API's OData service root; MyBTP AI resolves that root.
  const entitySet = request.entitySet;
  const keyOrPath = request.keyOrPath;
  const body = JSON.stringify({
    apiId: /^\d+$/.test(request.apiId) ? Number(request.apiId) : request.apiId,
    entitySet,
    method: request.method || "GET",
    keyOrPath,
    queryParams: query,
    rawQuery: rawQuery(query),
    payload: request.payload,
  });

  const send = async (token: string) =>
    fetch(s.baseUrl + "/api/v1/gateway/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token,
        "x-app-name": s.appName,
      },
      body,
    });

  let res = await send(await getToken());
  if (res.status === 401) res = await send(await getToken(true));
  if (!res.ok) {
    // 401/403 here mean MyBTP AI rejected this app; SAP-side failures arrive as 4xx/5xx with SAP_* codes.
    const err = await hubError(res);
    const prefix = err.code.startsWith("SAP_") ? "SAP error" : err.code.startsWith("HUB_") ? "MyBTP AI refused the request" : "Request failed";
    throw new MyBtpError(prefix + " (" + (err.code || res.status) + "): " + err.message, res.status >= 500 || res.status === 401 || res.status === 403 ? 502 : res.status);
  }
  return res.json();
}

// --- AI tools ------------------------------------------------------------------------
// The same tools MyBTP AI serves over MCP. Give listTools("anthropic" | "openai") to your LLM and run
// every tool call with callTool(name, args). Changes return a confirmation_token: show the summary to
// the user and only after approval call callTool("sap_execute", { confirmation_token }).
export type ToolFormat = "mybtp" | "anthropic" | "openai" | "mcp";

async function hubJson(pathname: string, init: { method: string; body?: string }): Promise<{ status: number; data: any }> {
  const s = settings();
  const send = async (token: string) =>
    fetch(s.baseUrl + pathname, {
      method: init.method,
      body: init.body,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token,
        "x-app-name": s.appName,
      },
    });
  let res = await send(await getToken());
  if (res.status === 401) res = await send(await getToken(true));
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function listTools(format: ToolFormat = "mybtp"): Promise<{ instructions: string; tools: unknown[] }> {
  const { status, data } = await hubJson("/api/v1/integration?format=" + format, { method: "GET" });
  if (status >= 400) {
    throw new MyBtpError("MyBTP AI tools are unavailable (" + (data.error_code || status) + "): " + (data.error || ""), status === 401 || status === 403 ? 502 : status);
  }
  return { instructions: data.instructions || "", tools: data.tools || [] };
}

/** Runs one tool call. Tool errors (with a hint for the model) are returned, not thrown. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; status: number; result: unknown }> {
  const { status, data } = await hubJson("/api/v1/tools/" + encodeURIComponent(name), { method: "POST", body: JSON.stringify(args || {}) });
  if (status === 401 || status === 403) throw new MyBtpError("MyBTP AI refused the tool call (" + (data.error_code || status) + "): " + (data.error || ""), 502);
  return { ok: status < 400, status, result: data };
}
