import { useState } from "react";
import {
  Target,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  ShoppingBag,
  Smartphone,
  Umbrella,
  Landmark,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFinance } from "../hooks/useFinance";
import type { SavingsGoal } from "../types";
import { Dialog } from "../components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "../components/Feedback";
import { money } from "../utils/format";

const ICONS: Record<string, LucideIcon> = {
  target: Target,
  home: Home,
  car: Car,
  plane: Plane,
  graduation: GraduationCap,
  heart: Heart,
  shopping: ShoppingBag,
  phone: Smartphone,
  umbrella: Umbrella,
  bank: Landmark,
};

const COLORS = [
  "#6366F1", // Indigo
  "#087955", // Emerald
  "#BD354F", // Rose
  "#D97706", // Amber
  "#0284C7", // Sky
  "#7C3AED", // Violet
  "#EC4899", // Pink
  "#2563EB", // Blue
];

export default function GoalsPage() {
  const { user } = useAuth();
  const {
    data: goals,
    loading,
    error,
    reload,
  } = useFinance<SavingsGoal[]>("/goals");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(
    null,
  );
  const [contribAmount, setContribAmount] = useState("");
  const [busy, setBusy] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("target");
  const [color, setColor] = useState("#6366F1");

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("");
    setIcon("target");
    setColor("#6366F1");
    setOpen(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditing(g);
    setTitle(g.title);
    setTargetAmount(String(g.targetAmount));
    setCurrentAmount(String(g.currentAmount));
    setDeadline(g.deadline || "");
    setIcon(g.icon || "target");
    setColor(g.color || "#6366F1");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) {
      toast.error("Please fill in goal title and target amount");
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        await api.put(`/goals/${editing.id}`, {
          title,
          targetAmount: Number(targetAmount),
          currentAmount: currentAmount ? Number(currentAmount) : 0,
          deadline,
          icon,
          color,
        });
        toast.success("Goal updated successfully");
      } else {
        await api.post("/goals", {
          title,
          targetAmount: Number(targetAmount),
          currentAmount: currentAmount ? Number(currentAmount) : 0,
          deadline,
          icon,
          color,
        });
        toast.success("Savings goal created!");
      }
      setOpen(false);
      reload();
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setBusy(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal || !contribAmount || Number(contribAmount) <= 0) {
      toast.error("Enter a valid contribution amount");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/goals/${contributeGoal.id}/contribute`, {
        amount: Number(contribAmount),
      });
      toast.success("Contribution recorded! Milestone updated.");
      setContributeGoal(null);
      setContribAmount("");
      reload();
    } catch {
      toast.error("Could not record contribution");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success("Goal removed");
      reload();
    } catch {
      toast.error("Failed to delete goal");
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SAVINGS JOURNEY</div>
          <h1>
            Savings Goals<span className="title-dot">.</span>
          </h1>
          <p>Fund your dreams, build emergency reserves, track milestones.</p>
        </div>
        <div className="heading-actions">
          <button className="button primary" onClick={openCreate}>
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton height={280} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !goals?.length ? (
        <div className="panel">
          <EmptyState
            title="No savings goals yet"
            description="Set a target for a rainy-day fund, tech gadget, or vacation."
            action="Create your first goal"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {goals.map((g) => {
            const IconComponent = ICONS[g.icon] || Target;
            const pct = Math.min(
              100,
              Math.round(
                Number(
                  g.completionPct || (g.currentAmount / g.targetAmount) * 100,
                ),
              ),
            );
            const isCompleted = g.status === "completed" || pct >= 100;

            return (
              <div
                key={g.id}
                className="panel"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: `${g.color}18`,
                          color: g.color,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <IconComponent size={22} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                          {g.title}
                        </h2>
                        {g.deadline && (
                          <small
                            className="subtle"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Calendar size={12} /> Target: {g.deadline}
                          </small>
                        )}
                      </div>
                    </div>
                    <span
                      className="pill"
                      style={{
                        background: isCompleted ? "#08795518" : "var(--hover)",
                        color: isCompleted ? "var(--income)" : "var(--text)",
                        borderColor: isCompleted
                          ? "var(--income)"
                          : "var(--border)",
                        fontWeight: 600,
                      }}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2
                            size={11}
                            style={{ display: "inline", marginRight: 3 }}
                          />
                          Completed
                        </>
                      ) : (
                        `${pct}% funded`
                      )}
                    </span>
                  </div>

                  <div style={{ margin: "18px 0 10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ fontSize: 24, fontWeight: 700 }}>
                        {money(Number(g.currentAmount), user?.currency)}
                      </strong>
                      <span className="subtle" style={{ fontSize: 12 }}>
                        of {money(Number(g.targetAmount), user?.currency)}
                      </span>
                    </div>

                    <div
                      style={{
                        height: 8,
                        borderRadius: 6,
                        background: "var(--hover)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: isCompleted ? "var(--income)" : g.color,
                          borderRadius: 6,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => openEdit(g)}
                      title="Edit Goal"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(g.id)}
                      title="Delete Goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setContributeGoal(g);
                      setContribAmount("");
                    }}
                  >
                    <Coins size={14} /> Contribute
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Dialog */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Savings Goal" : "Create Savings Goal"}
        description="Set a target and deadline to build financial momentum."
      >
        <form onSubmit={handleSubmit} className="dialog-form">
          <label>
            Goal Title
            <input
              required
              placeholder="e.g., Emergency Reserve, New MacBook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <label>
              Target Amount ({user?.currency || "INR"})
              <input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="50000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </label>
            <label>
              Current Savings ({user?.currency || "INR"})
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </label>
          </div>

          <label>
            Target Date (Optional)
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>

          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "block",
                marginBottom: 8,
              }}
            >
              Choose Icon
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {Object.entries(ICONS).map(([key, IconCmp]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 9,
                    border: `2px solid ${icon === key ? color : "var(--border)"}`,
                    background: icon === key ? `${color}20` : "var(--hover)",
                    color: icon === key ? color : "var(--muted)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <IconCmp size={19} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                display: "block",
                marginBottom: 8,
              }}
            >
              Accent Color
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: c,
                    border:
                      color === c
                        ? "3px solid var(--text)"
                        : "2px solid transparent",
                    boxShadow:
                      color === c
                        ? "0 0 0 2px var(--panel), 0 2px 8px #0002"
                        : "none",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="button primary">
              {busy ? "Saving…" : editing ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog
        open={!!contributeGoal}
        onOpenChange={(v) => !v && setContributeGoal(null)}
        title={`Contribute to ${contributeGoal?.title}`}
        description="Add money from your monthly surplus toward this goal."
      >
        <form onSubmit={handleContribute} className="dialog-form">
          <label>
            Contribution Amount ({user?.currency || "INR"})
            <input
              required
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 2500"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
            />
          </label>
          <div className="dialog-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => setContributeGoal(null)}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="button primary">
              <TrendingUp size={14} /> Add Contribution
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
