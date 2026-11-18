import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const links = [
  ["/", "Dashboard", "grid"],
  ["/transactions", "Transactions", "receipt"],
  ["/categories", "Categories", "tag"],
  ["/budgets", "Budgets", "wallet"],
  ["/reports", "Reports", "chart"],
  ["/profile", "Profile", "user"],
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    tag: (
      <>
        <path d="M20 13 13 20l-9-9V4h7Z" />
        <circle cx="8" cy="8" r="1" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 6h15a3 3 0 0 1 3 3v9H3Z" />
        <path d="M3 6V4h13v2M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b border-slate-200 bg-white px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r md:px-5 md:py-6">
        <Link to="/" className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-200">
            F
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-slate-900">
              Finance
            </span>
            <span className="block text-xs font-medium text-slate-400">
              Personal Portal
            </span>
          </span>
        </Link>
        <nav className="mt-5 flex gap-1 overflow-x-auto md:mt-8 md:block md:space-y-1 md:overflow-visible">
          {links.map(([to, n, icon]) => (
            <NavLink className="nav shrink-0" to={to} key={to}>
              <Icon name={icon} />
              <span>{n}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-slate-100 pt-4 md:block">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.fullName}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              className="rounded-lg bg-transparent px-2 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => void logout()}
              aria-label="Log out"
            >
              ×
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:ml-64 md:px-8 md:py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
