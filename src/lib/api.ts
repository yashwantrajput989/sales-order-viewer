// Data access for screens. All requests go to this app's backend (/api/*),
// which calls SAP through MyBTP AI. No SAP credentials are ever in the browser.
import { useCallback, useEffect, useState } from "react";

import { ENTITIES, type EntityKey } from "./entities";

export type Row = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.startsWith("/api/auth/")) {
    window.dispatchEvent(new Event("app:signed-out"));
  }
  if (!res.ok) throw new ApiError(body.error || res.statusText || "Request failed", res.status);
  return body as T;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Encodes a record's key fields into a URL-safe id for detail routes. */
export function recordId(entity: EntityKey, row: Row): string {
  const key: Row = {};
  for (const name of ENTITIES[entity].keys) key[name] = row[name];
  return toBase64Url(JSON.stringify(key));
}

/** "?A=1&B=2" for the given row fields (used to open child screens). */
export function paramsFrom(row: Row | null | undefined, names: string[]): string {
  const search = new URLSearchParams();
  for (const name of names) {
    const value = row ? row[name] : undefined;
    if (value !== undefined && value !== null && value !== "") search.set(name, String(value));
  }
  const text = search.toString();
  return text ? "?" + text : "";
}

/** Rows of a list screen. The server applies the screen's filters, field selection and paging. */
export function useScreenRows(screenId: string, params: Record<string, string> = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramKey = JSON.stringify(params);

  const load = useCallback(
    (skip: number) => {
      setLoading(true);
      setError(null);
      const search = new URLSearchParams(JSON.parse(paramKey) as Record<string, string>);
      search.set("skip", String(skip));
      request<{ rows: Row[]; hasMore: boolean }>("/api/screens/" + screenId + "/rows?" + search.toString())
        .then((data) => {
          setRows((prev) => (skip === 0 ? data.rows : prev.concat(data.rows)));
          setHasMore(data.hasMore);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [screenId, paramKey],
  );

  const reload = useCallback(() => load(0), [load]);
  useEffect(reload, [reload]);
  return { rows, hasMore, loading, error, reload, loadMore: () => load(rows.length) };
}

export function useEntityRecord(entity: EntityKey, id: string | undefined) {
  const [record, setRecord] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    request<{ row: Row }>("/api/data/" + entity + "/record?key=" + encodeURIComponent(id))
      .then((data) => setRecord(data.row))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [entity, id, version]);

  return { record, loading, error, reload: () => setVersion((v) => v + 1) };
}

export async function createRecord(entity: EntityKey, values: Row): Promise<Row | null> {
  const data = await request<{ row: Row | null }>("/api/data/" + entity, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  return data.row;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  result: Row | null;
  resultValue: unknown;
}

/** Runs an SAP action (bound action / function import) through the backend. */
export async function runAction(
  actionId: string,
  values: { record?: Row | null; form?: Row; params?: Record<string, string> },
): Promise<ActionResult> {
  return request<ActionResult>("/api/actions/" + actionId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export function matchesSearch(row: Row, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return Object.values(row).some((v) => v !== null && typeof v !== "object" && String(v).toLowerCase().includes(q));
}
