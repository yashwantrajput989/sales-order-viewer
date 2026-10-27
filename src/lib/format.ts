// Display helpers for SAP values (handles OData v2 "/Date(...)/" and v4 ISO dates).
export function formatValue(value: unknown, type = "string"): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return "";
  if (type === "boolean") return value === true || value === "true" ? "Yes" : "No";
  const v2 = /^\/Date\((-?\d+)/.exec(String(value));
  if (type === "date" || type === "datetime" || v2) {
    const date = v2 ? new Date(Number(v2[1])) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return type === "date" ? date.toLocaleDateString() : date.toLocaleString();
  }
  if (type === "currency" || type === "number") {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return type === "currency"
      ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toLocaleString();
  }
  return String(value);
}
