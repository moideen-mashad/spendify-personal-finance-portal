import { useState } from "react";
import {
  RefreshCw,
  Plus,
  Play,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  PauseCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  LayoutGrid,
  Table,
} from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFinance } from "../hooks/useFinance";
import { usePersistentView } from "../hooks/usePersistentView";
import type { RecurringTransaction, Category } from "../types";
import { Dialog } from "../components/ui/dialog";
import { Select } from "../components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "../components/Feedback";
import { money, date } from "../utils/format";

function isWaitingForNextRun(item: RecurringTransaction): boolean {
  if (!item.lastRunAt) return false;

  const nextRunDate = new Date(item.nextRunDate);
  const today = new Date();
  nextRunDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return nextRunDate > today;
}

export default function RecurringPage() {
  const { user } = useAuth();
  const {
    data: items,
    loading,
    error,
    reload,
    setData: setItems,
  } = useFinance<RecurringTransaction[]>("/recurring");
  const { data: categories } = useFinance<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [view, setView] = usePersistentView("spendify:view:recurring", "table");

  // Form
  const [title, setTitle] = useState("");
  const [txnType, setTxnType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextRunDate, setNextRunDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setTxnType("expense");
    setCategoryId("");
    setAmount("");
    setFrequency("monthly");
    setNextRunDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  };

  const openEdit = (item: RecurringTransaction) => {
    setEditing(item);
    setTitle(item.title);
    setTxnType(item.txnType);
    setCategoryId(String(item.categoryId));
    setAmount(String(item.amount));
    setFrequency(item.frequency);
    setNextRunDate(item.nextRunDate.slice(0, 10));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !categoryId) {
      toast.error("Please fill in title, category, and amount");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title,
        txnType,
        categoryId: Number(categoryId),
        amount: Number(amount),
        frequency,
        nextRunDate,
      };

      if (editing) {
        await api.put(`/recurring/${editing.id}`, payload);
        toast.success("Schedule updated");
      } else {
        await api.post("/recurring", payload);
        toast.success("Recurring schedule added!");
      }
      setOpen(false);
      reload();
    } catch {
      toast.error("Failed to save recurring schedule");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this recurring schedule?")) return;
    try {
      await api.delete(`/recurring/${id}`);
      toast.success("Recurring schedule removed");
      reload();
    } catch {
      toast.error("Could not delete schedule");
    }
  };

  const handleRunNow = async (id: number) => {
    if (runningId !== null) return;
    setRunningId(id);
    try {
      const response = await api.post<{
        nextRunDate: string;
        lastRunAt: string;
      }>(`/recurring/${id}/run`);
      setItems((current) =>
        current?.map((item) =>
          item.id === id
            ? {
                ...item,
                nextRunDate: response.data.nextRunDate,
                lastRunAt: response.data.lastRunAt,
              }
            : item,
        ),
      );
      toast.success("Schedule processed! Transaction added to your ledger.");
      reload();
    } catch (error) {
      if (
        isAxiosError<{ error?: string }>(error) &&
        error.response?.status === 409
      ) {
        toast.error(
          error.response.data.error ||
            "This schedule has already been posted for this period.",
        );
        reload();
      } else {
        toast.error("Failed to run schedule");
      }
    } finally {
      setRunningId(null);
    }
  };

  const filteredCategories = (categories || []).filter(
    (c) => c.type === txnType,
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AUTOMATED SCHEDULES</div>
          <h1>
            Recurring Bills & Income<span className="title-dot">.</span>
          </h1>
          <p>
            Never miss rent, utility bills, EMI payments, or monthly salary.
          </p>
        </div>
        <div className="heading-actions">
          <div className="view-toggle" role="group" aria-label="Recurring view">
            <button
              type="button"
              className={view === "grid" ? "selected" : ""}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={view === "table" ? "selected" : ""}
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Table size={15} />
            </button>
          </div>
          <button className="button primary" onClick={openCreate}>
            <Plus size={16} /> Add Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton height={260} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !items?.length ? (
        <div className="panel">
          <EmptyState
            title="No automated schedules set"
            description="Add recurring monthly rent, Netflix subscriptions, or salary to track upcoming cash flows."
            action="Set up a schedule"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="panel recurring-panel" style={{ overflow: "hidden" }}>
          {view === "table" ? (
            <div style={{ overflowX: "auto" }}>
              <table
                className="recurring-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--hover)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    <th style={{ padding: "12px 18px" }}>Schedule Name</th>
                    <th style={{ padding: "12px 18px" }}>Frequency</th>
                    <th style={{ padding: "12px 18px" }}>Next Due Date</th>
                    <th style={{ padding: "12px 18px" }}>Amount</th>
                    <th style={{ padding: "12px 18px" }}>Status</th>
                    <th style={{ padding: "12px 18px", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        fontSize: 12,
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background:
                                it.txnType === "income"
                                  ? "#08795515"
                                  : "#bd354f15",
                              color:
                                it.txnType === "income"
                                  ? "var(--income)"
                                  : "var(--expense)",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {it.txnType === "income" ? (
                              <ArrowDownLeft size={16} />
                            ) : (
                              <ArrowUpRight size={16} />
                            )}
                          </div>
                          <div>
                            <b style={{ display: "block" }}>{it.title}</b>
                            <small className="subtle">
                              {it.category.name || "Uncategorized"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          className="pill"
                          style={{
                            textTransform: "capitalize",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <RefreshCw size={10} /> {it.frequency}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          className="subtle"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Clock size={13} /> {date(it.nextRunDate)}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "14px 18px",
                          fontWeight: 600,
                          color:
                            it.txnType === "income"
                              ? "var(--income)"
                              : "var(--expense)",
                        }}
                      >
                        {it.txnType === "income" ? "+" : "-"}
                        {money(Number(it.amount), user?.currency)}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          className="pill"
                          style={{
                            background: it.isActive
                              ? "#08795515"
                              : "var(--hover)",
                            color: it.isActive
                              ? "var(--income)"
                              : "var(--muted)",
                          }}
                        >
                          {it.isActive ? "Active" : "Paused"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: "5px 9px", fontSize: 11 }}
                            onClick={() => handleRunNow(it.id)}
                            disabled={
                              runningId !== null || isWaitingForNextRun(it)
                            }
                            title={
                              isWaitingForNextRun(it)
                                ? "Already posted for this period"
                                : "Execute now"
                            }
                          >
                            <Play size={12} />{" "}
                            {runningId === it.id ? "Posting…" : "Post Now"}
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(it)}
                            title="Edit"
                            aria-label={`Edit ${it.title}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => handleDelete(it.id)}
                            title="Delete"
                            aria-label={`Delete ${it.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="recurring-grid">
              {items.map((it) => (
                <article className="recurring-card" key={it.id}>
                  <div className="recurring-card-heading">
                    <div
                      className={
                        "recurring-type-icon " +
                        (it.txnType === "income" ? "income" : "expense")
                      }
                    >
                      {it.txnType === "income" ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </div>
                    <div className="recurring-card-title">
                      <b>{it.title}</b>
                      <small>{it.category.name || "Uncategorized"}</small>
                    </div>
                    <span
                      className={"pill " + (it.isActive ? "income" : "subtle")}
                    >
                      {it.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div
                    className={
                      "recurring-card-amount " +
                      (it.txnType === "income" ? "income" : "expense")
                    }
                  >
                    {it.txnType === "income" ? "+" : "−"}
                    {money(Number(it.amount), user?.currency)}
                  </div>
                  <div className="recurring-card-details">
                    <span>
                      <small>Frequency</small>
                      <b>
                        <RefreshCw size={12} /> {it.frequency}
                      </b>
                    </span>
                    <span>
                      <small>Next due</small>
                      <b>
                        <Calendar size={12} /> {date(it.nextRunDate)}
                      </b>
                    </span>
                  </div>
                  <div className="recurring-card-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => handleRunNow(it.id)}
                      disabled={runningId !== null || isWaitingForNextRun(it)}
                      title={
                        isWaitingForNextRun(it)
                          ? "Already posted for this period"
                          : "Execute now"
                      }
                    >
                      <Play size={12} />{" "}
                      {runningId === it.id ? "Posting…" : "Post Now"}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openEdit(it)}
                      title="Edit"
                      aria-label={`Edit ${it.title}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(it.id)}
                      title="Delete"
                      aria-label={`Delete ${it.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Recurring Schedule" : "Add Recurring Schedule"}
        description="Automate repetitive expenses and incoming cash flows."
      >
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="segmented" style={{ marginBottom: 4 }}>
            <button
              type="button"
              className={txnType === "expense" ? "selected" : ""}
              onClick={() => {
                setTxnType("expense");
                setCategoryId("");
              }}
            >
              Expense
            </button>
            <button
              type="button"
              className={txnType === "income" ? "selected" : ""}
              onClick={() => {
                setTxnType("income");
                setCategoryId("");
              }}
            >
              Income
            </button>
          </div>

          <label>
            Title
            <input
              required
              placeholder="e.g., House Rent, Fiber Internet, Gym"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label>
            Category
            <Select
              label="Category"
              placeholder="Select category"
              value={categoryId}
              onValueChange={setCategoryId}
              options={filteredCategories.map((c) => ({
                value: String(c.id),
                label: c.name,
                color: c.color,
              }))}
            />
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <label>
              Amount ({user?.currency || "INR"})
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label>
              Frequency
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>

          <label>
            Next Execution Date
            <input
              required
              type="date"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
            />
          </label>

          <div className="dialog-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="button primary">
              {busy ? "Saving…" : editing ? "Save Changes" : "Create Schedule"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
