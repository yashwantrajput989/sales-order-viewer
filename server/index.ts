// Backend for this app: user sign-in, app context, and SAP data/actions through MyBTP AI.
// Every /api route except health and sign-in requires a signed-in user.
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";

import {
  appConfig,
  callTool,
  extractRows,
  invoke,
  isConfigured,
  listTools,
  MyBtpError,
  verifyHubUser,
  type ToolFormat,
  type EntityConfig,
  type ValueSource,
} from "./mybtp.ts";
import { clearSession, initSessionSecret, readSession, writeSession, type Session } from "./session.ts";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
initSessionSecret();

const app = express();
app.use(express.json({ limit: "1mb" }));

const entities = new Map(appConfig.entities.map((e) => [e.key, e]));
const queries = new Map(appConfig.queries.map((q) => [q.screenId, q]));
const actions = new Map(appConfig.actions.map((a) => [a.id, a]));

function entityByKey(key: string): EntityConfig {
  const entity = entities.get(key);
  if (!entity) throw new MyBtpError("Unknown data source " + key, 404);
  return entity;
}

const NUMERIC = /Edm\.(Int|Byte|SByte|Decimal|Double|Single)/i;

function literal(type: string, value: unknown): string {
  if (NUMERIC.test(type) || /Edm\.(Guid|Boolean)/i.test(type)) return String(value);
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function defaultContext(): Record<string, string> {
  return Object.fromEntries(appConfig.contextVars.map((v) => [v.name, v.defaultValue || ""]));
}

function missingContext(session: Session): string[] {
  return appConfig.contextVars.filter((v) => v.required && !session.context[v.name]).map((v) => v.name);
}

// --- auth ------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mybtpConfigured: isConfigured() });
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    let user = { name: "Guest", email: "" };
    if (appConfig.signIn === "mybtp") {
      const email = String(req.body?.email || "").trim();
      const password = String(req.body?.password || "");
      if (!email || !password) throw new MyBtpError("Enter your email and password", 400);
      user = await verifyHubUser(email, password);
    }
    const session = { user, context: defaultContext() };
    writeSession(res, session);
    res.json({ user, context: session.context });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const session = readSession(req);
  res.json({
    signIn: appConfig.signIn,
    contextVars: appConfig.contextVars,
    user: session ? session.user : null,
    context: session ? session.context : {},
    missingContext: session ? missingContext(session) : [],
  });
});

/** Everything below requires a signed-in user. */
function requireSession(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Please sign in", code: "SIGN_IN_REQUIRED" });
    return;
  }
  (req as Request & { session: Session }).session = session;
  next();
}
const sessionOf = (req: Request) => (req as Request & { session: Session }).session;

app.put("/api/auth/context", requireSession, (req, res, next) => {
  try {
    const session = sessionOf(req);
    const context = { ...session.context };
    for (const v of appConfig.contextVars) {
      if (req.body?.[v.name] === undefined) continue;
      const value = String(req.body[v.name]).trim();
      if (v.options.length && value && !v.options.includes(value)) throw new MyBtpError(v.label + " must be one of " + v.options.join(", "), 400);
      context[v.name] = value;
    }
    writeSession(res, { user: session.user, context });
    res.json({ context, missingContext: missingContext({ ...session, context }) });
  } catch (err) {
    next(err);
  }
});

// --- values -------------------------------------------------------------------
type Values = { params?: Record<string, unknown>; record?: Record<string, unknown>; form?: Record<string, unknown> };

function resolve(source: ValueSource, session: Session, values: Values): unknown {
  switch (source.kind) {
    case "literal":
      return source.value;
    case "context":
      if (!session.context[source.name]) throw new MyBtpError("Choose a value for " + source.name + " first", 400);
      return session.context[source.name];
    case "param":
      return values.params?.[source.name];
    case "field":
      return values.form?.[source.name] ?? values.record?.[source.name];
  }
}

// --- data ----------------------------------------------------------------------
app.get("/api/screens/:screenId/rows", requireSession, async (req, res, next) => {
  try {
    const query = queries.get(String(req.params.screenId));
    if (!query) throw new MyBtpError("Unknown screen", 404);
    const entity = entityByKey(query.entityKey);
    const session = sessionOf(req);
    // Only declared route params are accepted from the browser.
    const params: Record<string, string> = {};
    for (const name of query.params) {
      const value = req.query[name];
      if (typeof value !== "string" || !value) throw new MyBtpError("Missing parameter " + name, 400);
      params[name] = value;
    }
    const filter = query.filters
      .map((f) => {
        const value = resolve(f.value, session, { params });
        const field = entity.fields.find((x) => x.name === f.field);
        return f.field + " " + f.operator + " " + literal(field ? field.type : "Edm.String", value);
      })
      .join(" and ");
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const odata: Record<string, string | number> = { $top: query.top + 1, $skip: skip };
    if (filter) odata.$filter = filter;
    if (query.select.length) odata.$select = query.select.join(",");
    const rows = extractRows(await invoke({ apiId: entity.apiId, entitySet: entity.entitySet, query: odata }));
    res.json({ rows: rows.slice(0, query.top), hasMore: rows.length > query.top, source: "sap" });
  } catch (err) {
    next(err);
  }
});

app.get("/api/data/:entity/record", requireSession, async (req, res, next) => {
  try {
    const entity = entityByKey(String(req.params.entity));
    const key = JSON.parse(Buffer.from(String(req.query.key || ""), "base64url").toString("utf8")) as Record<string, unknown>;
    const filter = entity.keys
      .map((name) => {
        const field = entity.fields.find((f) => f.name === name);
        return name + " eq " + literal(field ? field.type : "Edm.String", key[name]);
      })
      .join(" and ");
    const data = await invoke({ apiId: entity.apiId, entitySet: entity.entitySet, query: { $filter: filter, $top: 1 } });
    const row = extractRows(data)[0];
    if (!row) throw new MyBtpError("Record not found", 404);
    res.json({ row, source: "sap" });
  } catch (err) {
    next(err);
  }
});

/** Converts form values to the types SAP expects and drops read-only fields. */
function toPayload(entity: EntityConfig, values: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of entity.fields) {
    if (!field.editable && !field.isKey) continue;
    const value = values[field.name];
    if (value === undefined || value === null || value === "") continue;
    if (/Edm\.(Int|Byte|SByte)/i.test(field.type)) payload[field.name] = Number(value);
    else if (/Edm\.(Decimal|Double|Single)/i.test(field.type)) payload[field.name] = String(value);
    else if (/Edm\.Boolean/i.test(field.type)) payload[field.name] = value === true || value === "true";
    else payload[field.name] = value;
  }
  return payload;
}

app.post("/api/data/:entity", requireSession, async (req, res, next) => {
  try {
    const entity = entityByKey(String(req.params.entity));
    const data = await invoke({ apiId: entity.apiId, entitySet: entity.entitySet, method: "POST", payload: toPayload(entity, req.body || {}) });
    res.status(201).json({ row: extractRows(data)[0] || null, source: "sap" });
  } catch (err) {
    next(err);
  }
});

// --- SAP actions ---------------------------------------------------------------------
app.post("/api/actions/:actionId", requireSession, async (req, res, next) => {
  try {
    const action = actions.get(String(req.params.actionId));
    if (!action) throw new MyBtpError("Unknown action", 404);
    const session = sessionOf(req);
    const values: Values = { params: req.body?.params || {}, record: req.body?.record || {}, form: req.body?.form || {} };
    // "{Field}" placeholders: form value, then record field, then app context.
    const keyOrPath = action.path.replace(/\{([A-Za-z0-9_]+)\}/g, (_m: string, name: string) => {
      const value = values.form?.[name] ?? values.record?.[name] ?? values.params?.[name] ?? session.context[name];
      if (value === undefined || value === null || value === "") throw new MyBtpError("Missing value for " + name, 400);
      return encodeURIComponent(String(value)).replace(/'/g, "''");
    });
    const payload: Record<string, unknown> = {};
    for (const p of action.params) {
      const value = resolve(p.value, session, values);
      if (value !== undefined && value !== "") payload[p.name] = value;
    }
    const data = await invoke({ apiId: action.apiId, method: action.method, keyOrPath, payload });
    const result = extractRows(data)[0] || null;
    const resultValue = action.resultField && result ? result[action.resultField] : undefined;
    console.log("[action] " + action.label + " by " + session.user.email + " -> " + (resultValue ?? "ok"));
    res.json({ ok: true, message: action.successMessage, result, resultValue: resultValue ?? null });
  } catch (err) {
    next(err);
  }
});

// --- AI tools (the same tools as MyBTP AI's MCP server) -------------------------------
app.get("/api/ai/tools", requireSession, async (req, res, next) => {
  try {
    const formats: ToolFormat[] = ["mybtp", "anthropic", "openai", "mcp"];
    const format = formats.find((f) => f === req.query.format) || "mybtp";
    res.json(await listTools(format));
  } catch (err) {
    next(err);
  }
});

app.post("/api/ai/tools/:name", requireSession, async (req, res, next) => {
  try {
    const name = String(req.params.name);
    const outcome = await callTool(name, req.body || {});
    console.log("[ai-tool] " + name + " by " + sessionOf(req).user.email + " -> " + outcome.status);
    res.status(outcome.ok ? 200 : outcome.status).json(outcome.result);
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof MyBtpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

// In production the backend also serves the built UI.
const dist = path.resolve("dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log("Server listening on http://localhost:" + port);
  if (!isConfigured()) console.warn("MyBTP AI is not configured yet - copy .env.example to .env and fill it in.");
});
