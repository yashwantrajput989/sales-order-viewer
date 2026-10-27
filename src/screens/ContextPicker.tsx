// Lets the user choose the app context (e.g. warehouse) used in every SAP query.
import { useState, type FormEvent } from "react";

import { useSession } from "../lib/session";

export default function ContextPicker({ onDone }: { onDone?: () => void }) {
  const { contextVars, context, setContext } = useSession();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(contextVars.map((v) => [v.name, context[v.name] || v.defaultValue || ""])),
  );
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await setContext(values);
      if (onDone) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Where are you working?</h2>
        {contextVars.map((v) => (
          <label key={v.name} className="block space-y-1">
            <span className="text-xs font-medium text-slate-500">
              {v.label}
              {v.required ? <span className="text-red-600"> *</span> : null}
            </span>
            {v.options.length ? (
              <select value={values[v.name]} onChange={(e) => setValues({ ...values, [v.name]: e.target.value })} required={v.required} className="h-11 w-full rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white px-3">
                <option value="">Choose…</option>
                {v.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input value={values[v.name]} onChange={(e) => setValues({ ...values, [v.name]: e.target.value })} required={v.required} className="h-11 w-full rounded-[var(--app-radius)] border border-[var(--app-border)] px-3" />
            )}
          </label>
        ))}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" className="h-11 w-full rounded-[var(--app-radius)] bg-[var(--app-primary)] font-medium text-white">Continue</button>
      </form>
    </div>
  );
}
