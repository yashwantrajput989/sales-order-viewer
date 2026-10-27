// Small UI kit used by the generated screens. Styled with Tailwind + theme variables (theme.css).
import { useRef, useState, type ReactNode } from "react";

import { formatValue } from "../lib/format";

const SPAN: Record<number, string> = {
  1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4",
  5: "md:col-span-5", 6: "md:col-span-6", 7: "md:col-span-7", 8: "md:col-span-8",
  9: "md:col-span-9", 10: "md:col-span-10", 11: "md:col-span-11", 12: "md:col-span-12",
};

/** Width on phones: everything is full width except count tiles (two per row). */
const PHONE_SPAN: Record<number, string> = { 6: "col-span-6", 12: "col-span-12" };

export function Cell({ span = 12, phone = 12, children }: { span?: number; phone?: number; children: ReactNode }) {
  return <div className={(PHONE_SPAN[phone] || PHONE_SPAN[12]) + " " + (SPAN[span] || SPAN[12])}>{children}</div>;
}

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-[var(--app-text)]">{title}</h1>
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white p-4 shadow-sm">
      {title ? <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2> : null}
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </section>
  );
}

export function StateMessage({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (loading) return <p className="py-6 text-center text-sm text-slate-500">Loading from SAP…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  return null;
}

export function Heading({ text }: { text: string }) {
  return <p className="text-base font-medium text-[var(--app-text)]">{text}</p>;
}

export function KpiCard({ label, value, onClick }: { label: string; value: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full rounded-[var(--app-radius)] border border-[var(--app-border)] bg-[var(--app-background)] p-4 text-left disabled:cursor-default"
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[var(--app-primary)]">{value}</p>
    </button>
  );
}

export function LinkCard({ title, description, onClick }: { title: string; description?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col items-start gap-1 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white p-4 text-left shadow-sm hover:border-[var(--app-primary)]"
    >
      <span className="text-base font-semibold text-[var(--app-text)]">{title}</span>
      {description ? <span className="text-sm text-slate-500">{description}</span> : null}
      <span className="mt-auto pt-2 text-sm font-medium text-[var(--app-accent)]">Open →</span>
    </button>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Search"}
      className="h-11 w-full rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--app-primary)]"
    />
  );
}

export interface Column {
  name: string;
  label: string;
  type: string;
}

/** How a row looks as a card on phones (field names). */
export interface CardSpec {
  title: string | null;
  subtitle: string[];
  badge: string | null;
  meta: string | null;
}

function RowCard({ row, columns, card, onClick, action }: { row: Record<string, unknown>; columns: Column[]; card: CardSpec; onClick?: () => void; action?: ReactNode }) {
  const col = (name: string | null) => (name ? columns.find((c) => c.name === name) : undefined);
  const show = (name: string | null) => {
    const c = col(name);
    return c ? formatValue(row[c.name], c.type) : "";
  };
  const title = col(card.title);
  return (
    <div
      onClick={onClick}
      className={"flex items-center gap-3 px-4 py-3 " + (onClick ? "cursor-pointer active:bg-[var(--app-background)]" : "")}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--app-text)]">{title ? show(card.title) || "—" : ""}</p>
        {card.subtitle.map((name) => (
          <p key={name} className="truncate text-xs text-slate-500">
            {col(name)?.label}: {show(name) || "—"}
          </p>
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {card.meta ? <span className="text-sm font-semibold text-[var(--app-text)]">{show(card.meta)}</span> : null}
        {card.badge && show(card.badge) ? (
          <span className="rounded-full bg-[var(--app-background)] px-2 py-0.5 text-[11px] font-medium text-slate-600">{show(card.badge)}</span>
        ) : null}
        {action ? <div onClick={(e) => e.stopPropagation()}>{action}</div> : null}
      </div>
      {onClick ? <span className="text-slate-300">›</span> : null}
    </div>
  );
}

export function DataTable({
  title,
  columns,
  rows,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRowClick,
  rowAction,
  card,
}: {
  title: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRowClick?: (row: Record<string, unknown>) => void;
  rowAction?: (row: Record<string, unknown>) => ReactNode;
  /** Phones show each row as a card (desktop and tablet keep the table). */
  card?: CardSpec;
}) {
  const phoneCard = card ?? { title: columns[0]?.name ?? null, subtitle: columns.slice(1, 3).map((c) => c.name), badge: null, meta: null };
  return (
    <div className="overflow-hidden rounded-[var(--app-radius)] border border-[var(--app-border)]">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-background)] px-4 py-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-slate-500">{loading && rows.length === 0 ? "" : rows.length + (hasMore ? "+" : "") + " records"}</span>
      </div>
      {error ? (
        <div className="p-4"><StateMessage error={error} /></div>
      ) : loading && rows.length === 0 ? (
        <div className="p-4"><StateMessage loading /></div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">No records found.</p>
      ) : (
        <>
        <div className="divide-y divide-[var(--app-border)] md:hidden">
          {rows.map((row, i) => (
            <RowCard
              key={i}
              row={row}
              columns={columns}
              card={phoneCard}
              {...(onRowClick ? { onClick: () => onRowClick(row) } : {})}
              {...(rowAction ? { action: rowAction(row) } : {})}
            />
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-slate-500">
              <tr>
                {columns.map((c) => <th key={c.name} className="px-4 py-2 font-medium">{c.label}</th>)}
                {rowAction ? <th className="px-4 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={"border-t border-[var(--app-border)] " + (onRowClick ? "cursor-pointer hover:bg-[var(--app-background)]" : "")}
                >
                  {columns.map((c) => <td key={c.name} className="px-4 py-2">{formatValue(row[c.name], c.type)}</td>)}
                  {rowAction ? <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>{rowAction(row)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      {hasMore && onLoadMore ? (
        <button type="button" onClick={onLoadMore} disabled={loading} className="w-full border-t border-[var(--app-border)] py-2 text-sm font-medium text-[var(--app-primary)] disabled:opacity-50">
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

export function ObjectHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-[var(--app-radius)] bg-[var(--app-primary)] px-5 py-4 text-white">
      <p className="text-xs uppercase tracking-wide opacity-75">{subtitle}</p>
      <p className="text-xl font-semibold">{title}</p>
    </div>
  );
}

export function FieldView({ label, value, type }: { label: string; value: unknown; type?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="min-h-9 rounded-[var(--app-radius)] bg-[var(--app-background)] px-3 py-2 text-sm">{formatValue(value, type)}</p>
    </div>
  );
}

async function scanBarcode(file: File): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector?: new () => { detect: (img: ImageBitmap) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!Detector) return null;
  const codes = await new Detector().detect(await createImageBitmap(file));
  return codes[0] ? codes[0].rawValue : null;
}

export function FieldInput({
  label,
  control,
  value,
  onChange,
  required,
  readOnly,
}: {
  label: string;
  control: string;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  readOnly?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const base =
    "w-full rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--app-primary)] disabled:bg-slate-100";
  const text = value === undefined || value === null ? "" : String(value);

  let input: ReactNode;
  if (control === "Switch" || control === "Checkbox") {
    input = (
      <input type="checkbox" checked={value === true} disabled={readOnly} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--app-primary)]" />
    );
  } else if (control === "Textarea") {
    input = <textarea value={text} disabled={readOnly} onChange={(e) => onChange(e.target.value)} rows={3} className={base + " py-2"} />;
  } else if (control === "Barcode Scanner" || control === "QR Scanner") {
    input = (
      <div className="flex gap-2">
        <input value={text} disabled={readOnly} onChange={(e) => onChange(e.target.value)} className={base + " h-11"} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded-[var(--app-radius)] bg-[var(--app-accent)] px-3 text-sm font-medium text-white"
        >
          Scan
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const code = await scanBarcode(file).catch(() => null);
            if (code) {
              setScanError(null);
              onChange(code);
            } else setScanError("No barcode detected (or scanning is not supported in this browser).");
          }}
        />
      </div>
    );
  } else {
    const type =
      control === "Number" || control === "Currency" ? "number" : control === "Date" ? "date" : control === "DateTime" ? "datetime-local" : "text";
    input = <input type={type} value={text} disabled={readOnly} onChange={(e) => onChange(e.target.value)} className={base + " h-11"} />;
  }

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-500">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {input}
      {scanError ? <span className="text-xs text-red-600">{scanError}</span> : null}
    </label>
  );
}

const VARIANTS: Record<string, string> = {
  primary: "bg-[var(--app-primary)] text-white hover:opacity-90",
  scan: "bg-[var(--app-accent)] text-white hover:opacity-90",
  danger: "bg-red-600 text-white hover:bg-red-700",
  default: "border border-[var(--app-border)] bg-white hover:bg-[var(--app-background)]",
};

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  compact,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "default" | "danger" | "scan";
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={(compact ? "h-9 px-3 " : "h-11 w-full px-4 ") + "rounded-[var(--app-radius)] text-sm font-medium disabled:opacity-50 " + (VARIANTS[variant] || VARIANTS.primary)}
    >
      {children}
    </button>
  );
}

/**
 * Runs an SAP action: optional confirmation, then shows the SAP result (e.g. document number) or the error.
 */
export function ActionRunner({
  label,
  confirm,
  run,
  onDone,
  variant = "primary",
  compact,
  disabled,
}: {
  label: string;
  confirm?: string;
  run: () => Promise<{ message: string; resultValue: unknown }>;
  onDone?: () => void;
  variant?: "primary" | "default" | "danger" | "scan";
  compact?: boolean;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);

  const execute = async () => {
    setAsking(false);
    setBusy(true);
    setOutcome(null);
    try {
      const res = await run();
      const extra = res.resultValue !== null && res.resultValue !== undefined && res.resultValue !== "" ? " (" + String(res.resultValue) + ")" : "";
      setOutcome({ ok: true, text: (res.message || "Done") + extra });
      if (onDone) onDone();
    } catch (err) {
      setOutcome({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "inline-flex flex-col items-end gap-1" : "space-y-2"}>
      {asking ? (
        <div className="space-y-2 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-[var(--app-background)] p-3 text-left">
          <p className="text-sm">{confirm}</p>
          <div className="flex gap-2">
            <ActionButton compact variant={variant} onClick={execute}>Yes, continue</ActionButton>
            <ActionButton compact variant="default" onClick={() => setAsking(false)}>Cancel</ActionButton>
          </div>
        </div>
      ) : (
        <ActionButton compact={compact} variant={variant} disabled={busy || disabled} onClick={() => (confirm ? setAsking(true) : void execute())}>
          {busy ? "Working…" : label}
        </ActionButton>
      )}
      {outcome ? (
        <p className={"text-xs " + (outcome.ok ? "text-emerald-700" : "text-red-700")}>{outcome.text}</p>
      ) : null}
    </div>
  );
}
