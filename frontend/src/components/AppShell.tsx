import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Wallet,
  Settings,
  PanelLeftClose,
  Search,
  Plus,
  Sun,
  Moon,
  Command,
  Menu,
  Layers,
  LogOut,
  Target,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Dialog } from "./ui/dialog";
import { TransactionDrawer } from "./transactions/TransactionDrawer";
import { DateRangeSelector } from "./DateRangeSelector";
const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: Wallet },
  { to: "/goals", label: "Savings Goals", icon: Target },
  { to: "/recurring", label: "Recurring", icon: RefreshCw },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/reports", label: "Analytics & reports", icon: ChartNoAxesCombined },
  { to: "/accounts", label: "Accounts", icon: Layers },
];
export default function AppShell() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dark, setDark] = useState(
    () => localStorage.getItem("finance-theme") === "dark",
  );
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("finance-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  return (
    <div className={"app-shell " + (collapsed ? "is-collapsed" : "")}>
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <span className="brand-mark">S.</span>
          {!collapsed && <span>Spendify</span>}
        </NavLink>
        <div className="workspace-label">
          {!collapsed && "PERSONAL WORKSPACE"}
        </div>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === "/"}
              className="nav"
              key={to}
              to={to}
              title={label}
            >
              <Icon size={19} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className="nav" to="/profile">
            <Settings size={19} />
            {!collapsed && "Settings"}
          </NavLink>
          <div className="user-block">
            <span className="avatar">{user?.fullName.slice(0, 1) || "Y"}</span>
            {!collapsed && (
              <div>
                <b>{user?.fullName}</b>
                <small>Personal account</small>
              </div>
            )}
            <button
              className="icon-button"
              onClick={() => void logout()}
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <Dialog open={mobile} onOpenChange={setMobile} title="Your workspace">
        <div className="mobile-nav">
          {[
            ...links,
            { to: "/profile", label: "Settings", icon: Settings },
          ].map((l) => (
            <NavLink
              onClick={() => setMobile(false)}
              className="nav"
              to={l.to}
              key={l.to}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </Dialog>
      <div className="app-content">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="icon-button desktop-only"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <b>
                {links.find((l) => l.to === location.pathname)?.label ||
                  "Settings"}
              </b>
            </span>
          </div>
          <div className="topbar-actions">
            <DateRangeSelector />
            <button
              className="command-trigger"
              onClick={() => setCommand(true)}
              aria-label="Open command palette"
            >
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? "Use light theme" : "Use dark theme"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="button primary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              <span>Add transaction</span>
            </button>
          </div>
        </header>
        <main className="main-content" key={revision}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Spendify · Your money, in perspective.</span>
          <span>Personal finance workspace</span>
        </footer>
      </div>
      <Dialog
        open={command}
        onOpenChange={setCommand}
        title="Where would you like to go?"
        description="Search pages or create a transaction. Shortcut: Ctrl or Command + K."
      >
        <div className="command-body">
          <label className="search-field">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search your workspace…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Command size={16} />
          </label>
          {[...links, { to: "/profile", label: "Settings", icon: Settings }]
            .filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
            .map((l) => (
              <button
                className="command-item"
                key={l.to}
                onClick={() => {
                  navigate(l.to);
                  setCommand(false);
                }}
              >
                <l.icon size={18} />
                {l.label}
              </button>
            ))}
          <button
            className="command-item"
            onClick={() => {
              setCommand(false);
              setAdding(true);
            }}
          >
            <Plus size={18} />
            Add transaction
          </button>
        </div>
      </Dialog>
      <TransactionDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => setRevision((v) => v + 1)}
      />
      <Toaster
        richColors
        theme={dark ? "dark" : "light"}
        position="bottom-right"
        closeButton
      />
    </div>
  );
}
