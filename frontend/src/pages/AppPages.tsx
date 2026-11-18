import { useEffect, useState } from "react";
import { Select } from "../components/ui/select";
import { DatePicker } from "../components/ui/date-picker";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { money, date } from "../utils/format";
import type { Category, Summary, Transaction } from "../types";
export function Dashboard() {
  const { user } = useAuth();
  const [s, setS] = useState<Summary>();
  const [t, setT] = useState<Transaction[]>([]);
  useEffect(() => {
    api.get("/reports/summary").then((r) => setS(r.data));
    api.get("/transactions?limit=5").then((r) => setT(r.data.data));
  }, []);
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">
            Personal overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>
        <a
          href="/transactions"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
        >
          + Add transaction
        </a>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Income", s?.totalIncome, "text-emerald-600", "bg-emerald-50"],
          ["Total Expense", s?.totalExpense, "text-rose-600", "bg-rose-50"],
          ["Net Balance", s?.balance, "text-indigo-600", "bg-indigo-50"],
          ["Savings Rate", s?.savingsRate, "text-amber-600", "bg-amber-50"],
        ].map(([n, v, cl]) => (
          <div className="card p-5" key={String(n)}>
            <p className="text-sm font-medium text-slate-500">{n}</p>
            <b className={"mt-2 block text-2xl tracking-tight " + cl}>
              {n === "Savings Rate"
                ? `${v ?? 0}%`
                : money(Number(v), user?.currency)}
            </b>
          </div>
        ))}
      </div>
      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Recent transactions</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Latest account activity
            </p>
          </div>
          <a
            href="/transactions"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all
          </a>
        </div>
        <List rows={t} />
      </section>
    </div>
  );
}
function List({ rows }: { rows: Transaction[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="table-head bg-slate-50/50">
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr className="table-row" key={x.id}>
              <td>{date(x.txnDate)}</td>
              <td>{x.categoryName}</td>
              <td>{x.description}</td>
              <td
                className={
                  x.categoryType === "income"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {x.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="py-5 text-slate-500">
          No transactions yet. Add one to start tracking.
        </p>
      )}
    </div>
  );
}
export function Transactions() {
  const [rows, setRows] = useState<Transaction[]>([]),
    [cats, setCats] = useState<Category[]>([]),
    [form, setForm] = useState({
      categoryId: "",
      amount: "",
      description: "",
      txnDate: new Date().toISOString().slice(0, 10),
    });
  const load = () =>
    api.get("/transactions?limit=100").then((r) => setRows(r.data.data));
  useEffect(() => {
    load();
    api.get("/categories").then((r) => setCats(r.data));
  }, []);
  return (
    <>
      <h1 className="text-2xl font-bold">Transactions</h1>
      <form
        className="card mt-5 grid gap-3 md:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/transactions", {
            ...form,
            categoryId: Number(form.categoryId),
            amount: Number(form.amount),
          });
          setForm({ ...form, amount: "", description: "" });
          load();
        }}
      >
        <Select
          label="Category"
          placeholder="Choose a category"
          value={form.categoryId}
          onValueChange={(v) => setForm({ ...form, categoryId: v })}
          options={cats.map((c) => ({
            value: String(c.id),
            label: c.name,
            description: c.type,
            color: c.color,
          }))}
        />
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <DatePicker
          label="Date"
          value={form.txnDate}
          onValueChange={(v) => setForm({ ...form, txnDate: v })}
        />
        <button>Add transaction</button>
      </form>
      <a
        className="mt-4 inline-block text-indigo-600"
        href="/api/v1/transactions/export"
      >
        Export CSV
      </a>
      <section className="card mt-3">
        <List rows={rows} />
      </section>
    </>
  );
}
export function Categories() {
  const [rows, setRows] = useState<Category[]>([]),
    [name, setName] = useState(""),
    [type, setType] = useState<"income" | "expense">("expense");
  const load = () => api.get("/categories").then((r) => setRows(r.data));
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <h1 className="text-2xl font-bold">Categories</h1>
      <form
        className="card mt-5 flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await api.post("/categories", { name, type, color: "#6366F1" });
          setName("");
          void load();
        }}
      >
        <input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select
          label="Category type"
          value={type}
          onValueChange={(v) => setType(v as "income" | "expense")}
          options={[
            { value: "expense", label: "Expense", color: "var(--expense)" },
            { value: "income", label: "Income", color: "var(--income)" },
          ]}
        />
        <button>Add</button>
      </form>
      <div className="card mt-5 grid gap-2">
        {rows.map((c) => (
          <div className="flex justify-between border-b pb-2" key={c.id}>
            <span>
              <i
                className="mr-2 inline-block h-3 w-3 rounded-full"
                style={{ background: c.color }}
              />
              {c.name} <small>({c.type})</small>
            </span>
            <button
              onClick={async () => {
                await api.delete("/categories/" + c.id);
                void load();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
export function Budgets() {
  const [rows, setRows] = useState<
    Array<{
      budgetId: number;
      categoryName: string;
      limit: number;
      spent: number;
      remaining: number;
      utilisationPercent: number;
      status: string;
    }>
  >([]);
  useEffect(() => {
    api.get("/reports/budget-vs-actual").then((r) => setRows(r.data));
  }, []);
  return (
    <>
      <h1 className="text-2xl font-bold">Budgets</h1>
      <section className="card mt-5">
        {rows.map((b) => (
          <div className="mb-5" key={b.budgetId}>
            <div className="flex justify-between">
              <b>{b.categoryName}</b>
              <span>
                {b.spent} / {b.limit}
              </span>
            </div>
            <div className="mt-2 h-3 rounded bg-slate-200">
              <div
                className={
                  b.status === "exceeded"
                    ? "h-3 rounded bg-red-500"
                    : b.status === "warning"
                      ? "h-3 rounded bg-amber-500"
                      : "h-3 rounded bg-green-500"
                }
                style={{ width: `${Math.min(b.utilisationPercent, 100)}%` }}
              />
            </div>
            <small>Remaining: {b.remaining}</small>
          </div>
        ))}
        {!rows.length && "No budgets for this month."}
      </section>
    </>
  );
}
export function Reports() {
  const [s, setS] = useState<Summary>();
  const [breakdown, setB] = useState<
    Array<{ name: string; total: number; percent: number }>
  >([]);
  useEffect(() => {
    api.get("/reports/summary").then((r) => setS(r.data));
    api.get("/reports/category-breakdown").then((r) => setB(r.data));
  }, []);
  return (
    <>
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="card mt-5">
        Income: {s?.totalIncome} | Expense: {s?.totalExpense} | Balance:{" "}
        {s?.balance}
      </div>
      <div className="card mt-5">
        <h2 className="font-semibold">Expense by category</h2>
        {breakdown.map((x) => (
          <p className="border-b py-2" key={x.name}>
            {x.name}: {x.total} ({x.percent}%)
          </p>
        ))}
      </div>
    </>
  );
}
export function Profile() {
  const { user, logout } = useAuth();
  return (
    <>
      <h1 className="text-2xl font-bold">Profile / Settings</h1>
      <section className="card mt-5">
        <p>
          <b>{user?.fullName}</b>
        </p>
        <p>{user?.email}</p>
        <p>Currency: {user?.currency}</p>
        <button className="mt-4" onClick={() => void logout()}>
          Log out
        </button>
      </section>
    </>
  );
}
