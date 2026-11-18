import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import type { SortingState } from "@tanstack/react-table";
import api from "../api/client";
import type { Category, Transaction } from "../types";
import type { TransactionPage } from "../types/finance";
import { useAuth } from "../context/AuthContext";
import { useFinance } from "../hooks/useFinance";
import {
  FacetedFilterBar,
  emptyFilters,
  type Filters,
} from "../components/transactions/FacetedFilterBar";
import {
  TransactionsDataTable,
  exportTransactions,
} from "../components/transactions/TransactionsDataTable";
import { TransactionDrawer } from "../components/transactions/TransactionDrawer";
import { ExcelImportModal } from "../components/transactions/ExcelImportModal";
import { Dialog } from "../components/ui/dialog";
import { Select } from "../components/ui/select";
import { ErrorState, Skeleton } from "../components/Feedback";
import { TableSkeleton } from "../components/LoadingStates";
export default function TransactionsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction>();
  const [bulk, setBulk] = useState<{
    kind: "delete" | "category";
    rows: Transaction[];
  }>();
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: categories } = useFinance<Category[]>("/categories");
  const filters: Filters = useMemo(
    () => ({
      q: params.get("q") || "",
      type: params.get("type") || "all",
      categories: params.getAll("category"),
      min: params.get("min_amount") || "",
      max: params.get("max_amount") || "",
      from: params.get("from") || "",
      to: params.get("to") || "",
    }),
    [params],
  );
  const sorting: SortingState = (params.get("sort") ?? "txnDate:desc")
    .split(",")
    .filter(Boolean)
    .map((s) => ({ id: s.split(":")[0], desc: s.split(":")[1] === "desc" }));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = [10, 25, 50, 100].includes(Number(params.get("limit")))
    ? Number(params.get("limit"))
    : 25;
  function update(values: Record<string, string>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(values).forEach(([k, v]) => next.set(k, v));
        return next;
      },
      { replace: true },
    );
  }
  function setFilters(f: Filters) {
    const next = new URLSearchParams(params);
    ["q", "type", "category", "min_amount", "max_amount", "from", "to"].forEach(
      (k) => next.delete(k),
    );
    if (f.q) next.set("q", f.q);
    if (f.type !== "all") next.set("type", f.type);
    f.categories.forEach((id) => next.append("category", id));
    Object.entries({
      min_amount: f.min,
      max_amount: f.max,
      from: f.from,
      to: f.to,
    }).forEach(([k, v]) => {
      if (v) next.set(k, v);
    });
    next.set("page", "1");
    setParams(next, { replace: true });
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const first = await api.get<TransactionPage>(
          "/transactions?limit=100&page=1",
          { signal: controller.signal },
        );
        let all = first.data.data;
        for (let p = 2; p <= Math.ceil(first.data.total / 100); p++) {
          const next = await api.get<TransactionPage>(
            `/transactions?limit=100&page=${p}`,
            { signal: controller.signal },
          );
          all = all.concat(next.data.data);
        }
        if (!controller.signal.aborted) setRows(all);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Transactions could not be loaded. Your data has not changed.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [version]);
  const filtered = rows.filter(
    (t) =>
      (filters.type === "all" || t.categoryType === filters.type) &&
      (!filters.q ||
        `${t.description} ${t.categoryName}`
          .toLowerCase()
          .includes(filters.q.toLowerCase())) &&
      (!filters.categories.length ||
        filters.categories.includes(String(t.categoryId))) &&
      (!filters.min || t.amount >= Number(filters.min)) &&
      (!filters.max || t.amount <= Number(filters.max)) &&
      (!filters.from || t.txnDate >= filters.from) &&
      (!filters.to || t.txnDate <= filters.to),
  );
  const counts = rows.reduce<Record<number, number>>((a, t) => {
    a[t.categoryId] = (a[t.categoryId] || 0) + 1;
    return a;
  }, {});
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / limit)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR MONEY IN MOTION</div>
          <h1>
            Transactions<span className="title-dot">.</span>
          </h1>
          <p>Every little detail. One clear picture.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => setExcelModalOpen(true)}
          >
            <FileSpreadsheet size={16} />
            Excel / CSV Engine
          </button>
          <button
            className="button secondary"
            disabled={!filtered.length}
            onClick={() => exportTransactions(filtered)}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            className="button primary"
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Add transaction
          </button>
        </div>
      </div>
      <section className="panel">
        <FacetedFilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories || []}
          counts={counts}
        />
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setVersion((v) => v + 1)}
          />
        ) : (
          <TransactionsDataTable
            rows={filtered}
            currency={user?.currency}
            q={filters.q}
            onEdit={(t) => {
              setEditing(t);
              setOpen(true);
            }}
            onDelete={(rows) => setBulk({ kind: "delete", rows })}
            onCategorize={(rows) => {
              setCategory("");
              setBulk({ kind: "category", rows });
            }}
            sorting={sorting}
            setSorting={(s) =>
              update({
                page: "1",
                sort: s
                  .map((x) => `${x.id}:${x.desc ? "desc" : "asc"}`)
                  .join(","),
              })
            }
            page={safePage}
            limit={limit}
            onPage={(n) => update({ page: String(n) })}
            onLimit={(n) => update({ limit: String(n), page: "1" })}
            onClear={() => setFilters(emptyFilters)}
          />
        )}
      </section>
      <TransactionDrawer
        open={open}
        transaction={editing}
        onClose={() => setOpen(false)}
        onSaved={() => setVersion((v) => v + 1)}
      />
      <Dialog
        open={!!bulk}
        onOpenChange={(v) => {
          if (!v && !busy) setBulk(undefined);
        }}
        title={
          bulk?.kind === "delete"
            ? "Delete selected transactions?"
            : "Categorize selected transactions"
        }
        description={
          bulk?.kind === "delete"
            ? "These records will be permanently removed. This action cannot be undone."
            : "Only categories of the same transaction type can be applied."
        }
      >
        <div className="dialog-body">
          <p>{bulk?.rows.length} transactions selected</p>
          {bulk?.kind === "category" && (
            <label>
              New category
              <Select
                label="New category"
                placeholder="Choose a category"
                value={category}
                onValueChange={setCategory}
                options={(categories || [])
                  .filter((c) =>
                    bulk.rows.every((t) => t.categoryType === c.type),
                  )
                  .map((c) => ({
                    value: String(c.id),
                    label: c.name,
                    color: c.color,
                  }))}
              />
            </label>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setBulk(undefined)}
            >
              Cancel
            </button>
            <button
              className={
                "button " + (bulk?.kind === "delete" ? "danger" : "primary")
              }
              disabled={busy || (bulk?.kind === "category" && !category)}
              onClick={async () => {
                if (!bulk) return;
                setBusy(true);
                const snapshot = rows;
                const ids = new Set(bulk.rows.map((t) => t.id));
                const cat = categories?.find((c) => String(c.id) === category);
                setRows((rows) =>
                  bulk.kind === "delete"
                    ? rows.filter((t) => !ids.has(t.id))
                    : rows.map((t) =>
                        ids.has(t.id) && cat
                          ? {
                              ...t,
                              categoryId: cat.id,
                              categoryName: cat.name,
                              categoryColor: cat.color,
                            }
                          : t,
                      ),
                );
                const results = await Promise.allSettled(
                  bulk.rows.map((t) =>
                    bulk.kind === "delete"
                      ? api.delete("/transactions/" + t.id)
                      : api.put("/transactions/" + t.id, {
                          categoryId: Number(category),
                          amount: t.amount,
                          description: t.description,
                          txnDate: t.txnDate,
                        }),
                  ),
                );
                if (results.some((r) => r.status === "rejected")) {
                  setRows(snapshot);
                  toast.error(
                    "Some changes failed. Refreshing the saved records.",
                  );
                } else toast.success("Transactions updated");
                setBusy(false);
                setBulk(undefined);
                setVersion((v) => v + 1);
              }}
            >
              {busy
                ? "Saving…"
                : bulk?.kind === "delete"
                  ? "Delete transactions"
                  : "Apply category"}
            </button>
          </div>
        </div>
      </Dialog>
      <ExcelImportModal
        open={excelModalOpen}
        onOpenChange={setExcelModalOpen}
        onSuccess={() => setVersion((v) => v + 1)}
      />
    </>
  );
}
