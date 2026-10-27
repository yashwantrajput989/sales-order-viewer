// Sign-in screen. Users sign in with their MyBTP AI account.
import { useState, type FormEvent } from "react";

import { useSession } from "../lib/session";

export default function Login({ appName }: { appName: string }) {
  const { signIn, signInWith } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWith(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-background)] p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-[var(--app-radius)] border border-[var(--app-border)] bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">{appName}</h1>
          <p className="text-sm text-slate-500">{signIn === "mybtp" ? "Sign in with your MyBTP AI account" : "Continue to the app"}</p>
        </div>
        {signIn === "mybtp" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required className="h-11 w-full rounded-[var(--app-radius)] border border-[var(--app-border)] px-3" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="h-11 w-full rounded-[var(--app-radius)] border border-[var(--app-border)] px-3" />
            </label>
          </>
        ) : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={busy} className="h-11 w-full rounded-[var(--app-radius)] bg-[var(--app-primary)] font-medium text-white disabled:opacity-50">
          {busy ? "Signing in…" : signIn === "mybtp" ? "Sign in" : "Continue"}
        </button>
      </form>
    </div>
  );
}
