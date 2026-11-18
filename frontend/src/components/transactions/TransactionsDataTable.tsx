import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  LayoutGrid,
  Table,
} from "lucide-react";
import type { Transaction } from "../../types";
import { money, date } from "../../utils/format";
import { getCategoryIcon } from "../categories/categoryIcons";
import { EmptyState } from "../Feedback";
import { Select } from "../ui/select";
export function exportTransactions(rows: Transaction[]) {
  const cell = (value: string) =>
    '"' +
    (/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') +
    '"';
  const csv = [
    ["Date", "Type", "Category", "Description", "Amount"],
    ...rows.map((t) => [
      t.txnDate,
      t.categoryType,
      t.categoryName,
      t.description,
      String(t.amount),
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "spendify-transactions.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  return index < 0 ? (
    <>{text}</>
  ) : (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
}
export function TransactionsDataTable({
  rows,
  currency,
  view,
  onViewChange,
  q = "",
  onEdit,
  onDelete,
  onCategorize,
  sorting,
  setSorting,
  page,
  limit,
  onPage,
  onLimit,
  onClear,
}: {
  rows: Transaction[];
  currency?: string;
  view: "grid" | "table";
  onViewChange: (view: "grid" | "table") => void;
  q?: string;
  onEdit: (t: Transaction) => void;
  onDelete?: (rows: Transaction[]) => void;
  onCategorize?: (rows: Transaction[]) => void;
  sorting: SortingState;
  setSorting: (s: SortingState) => void;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (n: number) => void;
  onClear: () => void;
}) {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [compact, setCompact] = useState(false);
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select current page"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={"Select " + row.original.description}
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <button
            className="merchant-cell"
            onClick={() => onEdit(row.original)}
          >
            <span
              className={
                "merchant-icon " +
                (row.original.categoryType === "income" ? "income" : "")
              }
            >
              {(row.original.description || row.original.categoryName)
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <span>
              <b>
                <Highlight
                  text={row.original.description || row.original.categoryName}
                  q={q}
                />
              </b>
              <small>
                {row.original.categoryType === "income"
                  ? "Money in"
                  : "Money out"}
              </small>
            </span>
          </button>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => {
          const Icon = getCategoryIcon(row.original.categoryIcon);
          return (
            <span className="category-badge">
              <span
                aria-hidden="true"
                style={{
                  width: 20,
                  height: 20,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 6,
                  color: row.original.categoryColor,
                  background: `${row.original.categoryColor}20`,
                  flexShrink: 0,
                }}
              >
                <Icon size={13} />
              </span>
              {row.original.categoryName}
            </span>
          );
        },
      },
      {
        accessorKey: "txnDate",
        header: "Date",
        cell: ({ row }) => date(row.original.txnDate),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <b
            className={
              row.original.categoryType === "income" ? "income" : "expense"
            }
          >
            {row.original.categoryType === "income" ? "+" : "−"}
            {money(row.original.amount, currency)}
          </b>
        ),
      },
    ],
    [currency, q, onEdit],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection: selection,
      pagination: { pageIndex: page - 1, pageSize: limit },
    },
    onSortingChange: (next) => {
      setSorting(typeof next === "function" ? next(sorting) : next);
    },
    onRowSelectionChange: setSelection,
    getRowId: (r) => String(r.id),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableMultiSort: true,
    sortDescFirst: false,
    isMultiSortEvent: () => true,
  });
  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const gridSort = sorting[0]
    ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}`
    : "txnDate:desc";
  return (
    <>
      <div className="table-meta">
        <span>
          {rows.length} transactions{" "}
          {view === "table" && (
            <span className="muted">
              · Click headings to sort; multiple columns supported
            </span>
          )}
        </span>
        <div className="table-view-actions">
          {view === "grid" && (
            <Select
              label="Sort transactions"
              className="select-compact"
              value={gridSort}
              onValueChange={(value) => {
                const [id, direction] = value.split(":");
                setSorting([{ id, desc: direction === "desc" }]);
              }}
              options={[
                { value: "txnDate:desc", label: "Newest first" },
                { value: "txnDate:asc", label: "Oldest first" },
                { value: "amount:desc", label: "Amount: high to low" },
                { value: "amount:asc", label: "Amount: low to high" },
                { value: "description:asc", label: "Description: A–Z" },
                { value: "description:desc", label: "Description: Z–A" },
              ]}
            />
          )}
          <div
            className="view-toggle"
            role="group"
            aria-label="Transaction view"
          >
            <button
              type="button"
              className={view === "grid" ? "selected" : ""}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => onViewChange("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={view === "table" ? "selected" : ""}
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => onViewChange("table")}
            >
              <Table size={15} />
            </button>
          </div>
          {view === "table" && (
            <button
              className="text-button"
              onClick={() => setCompact((v) => !v)}
            >
              {compact ? "Comfortable" : "Compact"} view
            </button>
          )}
        </div>
      </div>
      {rows.length ? (
        <>
          {view === "table" ? (
            <>
              <div className={"table-scroll " + (compact ? "compact" : "")}>
                <table className="finance-table">
                  <thead>
                    {table.getHeaderGroups().map((group) => (
                      <tr key={group.id}>
                        {group.headers.map((h) => (
                          <th
                            key={h.id}
                            aria-sort={
                              h.column.getIsSorted() === "asc"
                                ? "ascending"
                                : h.column.getIsSorted() === "desc"
                                  ? "descending"
                                  : "none"
                            }
                          >
                            {h.column.getCanSort() ? (
                              <button
                                onClick={h.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  h.column.columnDef.header,
                                  h.getContext(),
                                )}
                                {h.column.getIsSorted() === "asc" ? (
                                  <ArrowUp size={13} />
                                ) : h.column.getIsSorted() === "desc" ? (
                                  <ArrowDown size={13} />
                                ) : (
                                  <ArrowUpDown size={13} />
                                )}
                              </button>
                            ) : (
                              flexRender(
                                h.column.columnDef.header,
                                h.getContext(),
                              )
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        data-selected={row.getIsSelected()}
                        onClick={(e) => {
                          if (
                            !(e.target as HTMLElement).closest("button,input")
                          )
                            onEdit(row.original);
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="transaction-cards">
                {table.getRowModel().rows.map((row) => {
                  const t = row.original;
                  return (
                    <div className="mobile-transaction-row" key={t.id}>
                      <input
                        type="checkbox"
                        aria-label={`Select mobile ${t.description}`}
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                      <button
                        className="transaction-card"
                        onClick={() => onEdit(t)}
                      >
                        <span>
                          <b>{t.description || t.categoryName}</b>
                          <small>
                            {t.categoryName} · {date(t.txnDate)}
                          </small>
                        </span>
                        <b
                          className={
                            t.categoryType === "income" ? "income" : "expense"
                          }
                        >
                          {t.categoryType === "income" ? "+" : "−"}
                          {money(t.amount, currency)}
                        </b>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="transaction-grid" role="list">
              {table.getRowModel().rows.map((row) => {
                const t = row.original;
                const Icon = getCategoryIcon(t.categoryIcon);
                return (
                  <article
                    className="transaction-grid-card"
                    data-selected={row.getIsSelected()}
                    key={t.id}
                    role="listitem"
                  >
                    <div className="transaction-grid-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.description}`}
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                      <span
                        className="transaction-grid-category-icon"
                        style={{
                          color: t.categoryColor,
                          background: `${t.categoryColor}20`,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <span
                        className={
                          "transaction-type-pill " +
                          (t.categoryType === "income" ? "income" : "expense")
                        }
                      >
                        {t.categoryType === "income" ? "Income" : "Expense"}
                      </span>
                    </div>
                    <button
                      className="transaction-grid-main"
                      onClick={() => onEdit(t)}
                    >
                      <span>
                        <b>
                          <Highlight
                            text={t.description || t.categoryName}
                            q={q}
                          />
                        </b>
                        <small>
                          {t.categoryName} · {date(t.txnDate)}
                        </small>
                      </span>
                      <b
                        className={
                          t.categoryType === "income" ? "income" : "expense"
                        }
                      >
                        {t.categoryType === "income" ? "+" : "−"}
                        {money(t.amount, currency)}
                      </b>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          <div className="pagination">
            <span>
              Page {page} of {Math.max(1, table.getPageCount())}
            </span>
            <div>
              <label>
                Rows{" "}
                <Select
                  label="Rows per page"
                  className="select-compact"
                  value={String(limit)}
                  onValueChange={(v) => onLimit(Number(v))}
                  options={[10, 25, 50, 100].map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              </label>
              <button
                className="icon-button"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="icon-button"
                disabled={page >= table.getPageCount()}
                onClick={() => onPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="No matching transactions"
          description="Try a different search or give your filters a fresh start."
          action="Clear filters"
          onAction={onClear}
        />
      )}{" "}
      {!!selected.length && (
        <div className="bulk-bar">
          <b>{selected.length} selected</b>
          <button onClick={() => exportTransactions(selected)}>
            <Download size={15} />
            Export CSV
          </button>
          {onCategorize && (
            <button onClick={() => onCategorize(selected)}>Categorize</button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(selected)}>
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <button onClick={() => setSelection({})}>Clear</button>
        </div>
      )}
    </>
  );
}
