import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useSession } from "./lib/session";
import ContextPicker from "./screens/ContextPicker";
import Login from "./screens/Login";
import SalesOrders from "./screens/SalesOrders";
import SalesOrderDetails from "./screens/SalesOrderDetails";
import LineItems from "./screens/LineItems";
import DeliverySchedule from "./screens/DeliverySchedule";
import Partners from "./screens/Partners";
import DeliveriesInvoices from "./screens/DeliveriesInvoices";

const APP_NAME = "Sales Order Viewer";
const NAV = [
  { to: "/sales-orders", label: "Sales Orders" },
];

export default function App() {
  const session = useSession();
  const location = useLocation();
  const [changingContext, setChangingContext] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const overflow = NAV.length > 4;
  const barItems = overflow ? NAV.slice(0, 3) : NAV;
  const moreItems = overflow ? NAV.slice(3) : [];
  const moreActive = moreItems.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));

  if (session.loading) return <p className="p-8 text-center text-sm text-slate-500">Loading…</p>;
  if (!session.user) return <Login appName={APP_NAME} />;

  const contextChips = session.contextVars.filter((v) => session.context[v.name]);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "rounded-md px-3 py-1.5 whitespace-nowrap " + (isActive ? "bg-white/20 font-medium" : "opacity-80 hover:opacity-100");

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <header className="bg-[var(--app-brand)] text-white px-4 md:px-8">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4">
          <span className="font-semibold">{APP_NAME}</span>
          <nav className="hidden gap-1 overflow-x-auto text-sm md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>{item.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs">
            {contextChips.length ? (
              <button type="button" onClick={() => setChangingContext(true)} className="rounded-full bg-white/15 px-3 py-1" title="Change">
                {contextChips.map((v) => v.label + ": " + session.context[v.name]).join(" · ")}
              </button>
            ) : null}
            <span className="hidden sm:inline">{session.user.name}</span>
            <button type="button" onClick={() => void session.signOut()} className="opacity-80 hover:opacity-100">Sign out</button>
          </div>
        </div>
      </header>
      {session.missingContext.length || changingContext ? (
        <ContextPicker onDone={() => setChangingContext(false)} />
      ) : (
        <Routes>
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-order-details/:id" element={<SalesOrderDetails />} />
          <Route path="/line-items" element={<LineItems />} />
          <Route path="/delivery-schedule" element={<DeliverySchedule />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/deliveries-invoices" element={<DeliveriesInvoices />} />
          <Route path="*" element={<Navigate to="/sales-orders" replace />} />
        </Routes>
      )}
      {/* Phones: bottom menu with up to 4 items; with more, the last slot is "More" (side menu). */}
      {NAV.length > 1 ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--app-border)] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {barItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => bottomClass(isActive)}>
              <NavIcon label={item.label} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </NavLink>
          ))}
          {moreItems.length ? (
            <button type="button" onClick={() => setMoreOpen(true)} className={bottomClass(moreActive)} aria-haspopup="dialog">
              <span className="flex size-6 items-center justify-center text-lg leading-none">⋯</span>
              <span>More</span>
            </button>
          ) : null}
        </nav>
      ) : null}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] px-4">
              <span className="font-semibold">{APP_NAME}</span>
              <button type="button" onClick={() => setMoreOpen(false)} className="text-xl leading-none text-slate-500" aria-label="Close menu">×</button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => "flex items-center gap-3 rounded-[var(--app-radius)] px-3 py-2.5 text-sm " + (isActive ? "bg-[var(--app-background)] font-semibold text-[var(--app-primary)]" : "text-[var(--app-text)]")}
                >
                  <NavIcon label={item.label} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-[var(--app-border)] p-4 text-sm">
              <p className="font-medium">{session.user.name}</p>
              <button type="button" onClick={() => void session.signOut()} className="mt-1 text-[var(--app-primary)]">Sign out</button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

/** Square with the item's initial — the same shape the builder's wireframes show. */
function NavIcon({ label }: { label: string }) {
  return (
    <span className="flex size-6 items-center justify-center rounded-md bg-current/10 text-[11px] font-semibold">
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function bottomClass(active: boolean) {
  return "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] " + (active ? "font-semibold text-[var(--app-primary)]" : "text-slate-500");
}
