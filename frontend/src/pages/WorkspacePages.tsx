import { useState, useEffect, useRef } from "react";
import { MonthPicker } from "../components/ui/date-picker";
import { Link } from "react-router-dom";
import {
  Plus,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  User,
  Settings2,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  LayoutGrid,
  Table,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Select } from "../components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { useFinance } from "../hooks/useFinance";
import { usePersistentView } from "../hooks/usePersistentView";
import { useAuth } from "../context/AuthContext";
import type { BudgetActual } from "../types/finance";
import type { Category, AuditLog, User as UserModel } from "../types";
import { BudgetProgress } from "../components/dashboard/BudgetProgress";
import { Dialog } from "../components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "../components/Feedback";
import api from "../api/client";
import { money } from "../utils/format";

// ─────────────────────────── BudgetsPage ───────────────────────────
const budgetSchema = z.object({
  categoryId: z.coerce.number().positive("Select a category"),
  amountLimit: z.coerce
    .number()
    .positive("Enter a positive limit")
    .max(9999999999.99),
});

export function BudgetsPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [y, m] = month.split("-").map(Number);
  const { data, loading, error, reload } = useFinance<BudgetActual[]>(
    `/reports/budget-vs-actual?month=${m}&year=${y}`,
  );
  const { data: categories } = useFinance<Category[]>(
    "/categories?type=expense",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetActual>();
  const [view, setView] = usePersistentView("spendify:view:budgets", "grid");
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
  });
  const openBudgetEditor = (budget?: BudgetActual) => {
    setEditing(budget);
    reset(
      budget
        ? { categoryId: budget.categoryId, amountLimit: budget.limit }
        : { categoryId: 0, amountLimit: 0 },
    );
    setOpen(true);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SPEND WITH INTENTION</div>
          <h1>
            Your budgets<span className="title-dot">.</span>
          </h1>
          <p>A plan for your money. Room for your life.</p>
        </div>
        <div className="heading-actions">
          <div className="view-toggle" role="group" aria-label="Budget view">
            <button
              type="button"
              className={view === "grid" ? "selected" : ""}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={view === "table" ? "selected" : ""}
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Table size={16} />
            </button>
          </div>
          <MonthPicker
            label="Budget month"
            value={month}
            onValueChange={setMonth}
            className="month-control"
          />
          <button className="button primary" onClick={() => openBudgetEditor()}>
            <Plus size={16} />
            Add budget
          </button>
        </div>
      </div>
      <div className="info-banner">
        <ShieldCheck size={20} />
        <div>
          <b>A gentle heads-up, before you go over.</b>
          <p>Budgets turn amber at 80% and rose when you reach your limit.</p>
        </div>
      </div>
      {loading ? (
        <Skeleton height={320} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <div className="panel">
          <EmptyState
            title="Give your money a direction"
            description="Create your first monthly budget to stay on track."
            action="Create a budget"
            onAction={() => openBudgetEditor()}
          />
        </div>
      ) : view === "grid" ? (
        <div className="budget-grid">
          {data.map((b) => (
            <section className="panel panel-body" key={b.budgetId}>
              <div className="budget-card-top">
                <Wallet size={22} />
                <button
                  className="text-button"
                  onClick={() => openBudgetEditor(b)}
                >
                  Edit budget <ArrowUpRight size={14} />
                </button>
              </div>
              <BudgetProgress budget={b} currency={user?.currency} />
            </section>
          ))}
        </div>
      ) : (
        <div className="panel category-table-wrap">
          <table className="category-table budget-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="numeric-cell">Spent</th>
                <th className="numeric-cell">Budget</th>
                <th className="numeric-cell">Remaining</th>
                <th>Usage</th>
                <th className="category-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((budget) => {
                const percent = Number(budget.utilisationPercent);
                const tone =
                  percent >= 100
                    ? "expense"
                    : percent >= 80
                      ? "warning"
                      : "income";
                return (
                  <tr key={budget.budgetId}>
                    <td>
                      <div className="category-table-name">
                        <span className="budget-category-icon">
                          <Wallet size={16} />
                        </span>
                        <b>{budget.categoryName}</b>
                      </div>
                    </td>
                    <td className="numeric-cell">
                      {money(budget.spent, user?.currency)}
                    </td>
                    <td className="numeric-cell">
                      {money(budget.limit, user?.currency)}
                    </td>
                    <td
                      className={`numeric-cell ${budget.remaining < 0 ? "expense" : "income"}`}
                    >
                      {budget.remaining < 0
                        ? `-${money(Math.abs(budget.remaining), user?.currency)}`
                        : money(budget.remaining, user?.currency)}
                    </td>
                    <td>
                      <div className="budget-table-usage">
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label={`${budget.categoryName} budget usage`}
                          aria-valuenow={Math.min(percent, 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`fill ${tone}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <b className={tone}>{percent.toFixed(0)}%</b>
                      </div>
                    </td>
                    <td className="category-actions-heading">
                      <button
                        className="text-button"
                        onClick={() => openBudgetEditor(budget)}
                      >
                        Edit budget <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        drawer
        title={editing ? "Edit budget" : "Create a budget"}
        description="Choose a category and give it a monthly spending limit."
      >
        <form
          className="drawer-form"
          onSubmit={handleSubmit(async (values) => {
            try {
              if (editing)
                await api.put("/budgets/" + editing.budgetId, values);
              else await api.post("/budgets", { ...values, month: m, year: y });
              toast.success("Budget saved");
              reload();
              setOpen(false);
            } catch {
              toast.error(
                "Could not save. A budget may already exist for this category.",
              );
            }
          })}
        >
          <label>
            Expense category
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  label="Expense category"
                  placeholder="Select a category"
                  disabled={!!editing}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  invalid={!!errors.categoryId}
                  describedBy={
                    errors.categoryId ? "budget-category-error" : undefined
                  }
                  options={(categories || []).map((c) => ({
                    value: String(c.id),
                    label: c.name,
                    color: c.color,
                  }))}
                />
              )}
            />
            {errors.categoryId && (
              <span id="budget-category-error" className="field-error">
                {errors.categoryId.message}
              </span>
            )}
          </label>
          <label>
            Monthly limit
            <input
              className="amount-input"
              type="number"
              step="0.01"
              {...register("amountLimit")}
            />
            {errors.amountLimit && (
              <span className="field-error">{errors.amountLimit.message}</span>
            )}
          </label>
          <p className="subtle">Budget period: {month}</p>
          <div className="drawer-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button disabled={isSubmitting} className="button primary">
              {isSubmitting ? "Saving…" : "Save budget"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

// ─────────────────────────── AccountsPage ───────────────────────────
export function AccountsPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR FINANCIAL HOME</div>
          <h1>
            Accounts<span className="title-dot">.</span>
          </h1>
          <p>A place for everything you're building.</p>
        </div>
      </div>
      <div className="panel">
        <EmptyState
          title="Your personal ledger is ready"
          description="This workspace tracks transactions manually. Bank connections and separate account balances are not available in the current portal."
        />
        <div className="center-action">
          <Link className="button primary" to="/transactions">
            View your transactions <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── SettingsPage ───────────────────────────
const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  currency: z.string().min(1, "Select a currency"),
  monthlyIncomeGoal: z.coerce.number().min(0).optional(),
});

const financialSchema = z.object({
  fiscalStartDay: z.coerce.number().min(1).max(28),
  alertThresholdPct: z.coerce.number(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-zA-Z]/, "Must contain a letter")
      .regex(/[0-9]/, "Must contain a digit")
      .regex(/[^a-zA-Z0-9]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function getPasswordStrength(pw: string): {
  label: string;
  color: string;
  pct: number;
} {
  if (!pw) return { label: "", color: "var(--border)", pct: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 2) return { label: "Weak", color: "var(--expense)", pct: 33 };
  if (score <= 3) return { label: "Medium", color: "var(--warning)", pct: 66 };
  return { label: "Strong", color: "var(--income)", pct: 100 };
}

export function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const [tab, setTab] = useState<"profile" | "financial" | "security">(
    "profile",
  );
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarLoading(true);
      try {
        const res = await api.put<UserModel>("/users/me", { avatarUrl: dataUrl });
        updateUser(res.data);
        toast.success("Avatar photo updated!");
      } catch {
        toast.error("Failed to update avatar");
      } finally {
        setAvatarLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Profile form ──
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
      bio: user?.bio ?? "",
      currency: user?.currency ?? "INR",
      monthlyIncomeGoal: user?.monthlyIncomeGoal ?? 0,
    },
  });

  // ── Financial form ──
  const financialForm = useForm<z.infer<typeof financialSchema>>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      fiscalStartDay: user?.fiscalStartDay ?? 1,
      alertThresholdPct: user?.alertThresholdPct ?? 80,
    },
  });

  // ── Password form ──
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });
  const watchedNew = passwordForm.watch("newPassword", "");
  const strength = getPasswordStrength(watchedNew);

  // ── Audit logs ──
  const { data: auditLogs } = useFinance<AuditLog[]>("/audit-logs");

  // Reset profile form when user loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName,
        phone: user.phone ?? "",
        bio: user.bio ?? "",
        currency: user.currency,
        monthlyIncomeGoal: user.monthlyIncomeGoal ?? 0,
      });
      financialForm.reset({
        fiscalStartDay: user.fiscalStartDay ?? 1,
        alertThresholdPct: user.alertThresholdPct ?? 80,
      });
    }
  }, [user]);

  const initials =
    user?.fullName
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>
            Settings<span className="title-dot">.</span>
          </h1>
          <p>Your workspace, your preferences.</p>
        </div>
      </div>

      <section className="panel settings-panel">
        {/* Tab bar */}
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
          {(
            [
              { key: "profile", label: "Profile", icon: User },
              { key: "financial", label: "Financial", icon: Settings2 },
              { key: "security", label: "Security", icon: Lock },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px",
                fontSize: 12,
                fontWeight: 550,
                borderBottom:
                  tab === key
                    ? "2px solid var(--text)"
                    : "2px solid transparent",
                color: tab === key ? "var(--text)" : "var(--muted)",
                borderRadius: 0,
                marginBottom: -1,
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <form
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
            onSubmit={profileForm.handleSubmit(async (values) => {
              try {
                const res = await api.put<UserModel>("/users/me", values);
                updateUser(res.data);
                toast.success("Profile saved");
              } catch {
                toast.error("Could not save profile");
              }
            })}
          >
            {/* Avatar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "8px 0",
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--hover)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 22,
                  flexShrink: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  opacity: avatarLoading ? 0.6 : 1,
                }}
                title="Click to change avatar photo"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div>
                <b style={{ fontSize: 14 }}>{user?.fullName}</b>
                <p
                  style={{ color: "var(--muted)", fontSize: 11, marginTop: 4, cursor: "pointer" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarLoading ? "Uploading photo…" : "Click the avatar to update your photo"}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <label>
                Full Name
                <input {...profileForm.register("fullName")} />
                {profileForm.formState.errors.fullName && (
                  <span className="field-error">
                    {profileForm.formState.errors.fullName.message}
                  </span>
                )}
              </label>
              <label>
                Email address
                <input
                  value={user?.email ?? ""}
                  readOnly
                  style={{ opacity: 0.6 }}
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  {...profileForm.register("phone")}
                  placeholder="+91 98765 43210"
                />
              </label>
              <label>
                Preferred Currency
                <select {...profileForm.register("currency")}>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </label>
            </div>

            <label>
              Bio
              <textarea
                {...profileForm.register("bio")}
                rows={3}
                placeholder="A little about yourself…"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 7,
                  padding: "9px 12px",
                  font: "inherit",
                  borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  color: "var(--text)",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label>
              Monthly Income Goal
              <input
                type="number"
                step="0.01"
                min="0"
                {...profileForm.register("monthlyIncomeGoal")}
                placeholder="0.00"
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="button primary"
                disabled={profileForm.formState.isSubmitting}
              >
                {profileForm.formState.isSubmitting
                  ? "Saving…"
                  : "Save profile"}
              </button>
            </div>
          </form>
        )}

        {/* ── Financial Tab ── */}
        {tab === "financial" && (
          <form
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
            onSubmit={financialForm.handleSubmit(async (values) => {
              try {
                const res = await api.put<UserModel>("/users/me", values);
                updateUser(res.data);
                toast.success("Financial settings saved");
              } catch {
                toast.error("Could not save settings");
              }
            })}
          >
            <label>
              Fiscal Month Start Day
              <select {...financialForm.register("fiscalStartDay")}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}
                  </option>
                ))}
              </select>
              <span
                className="field-error"
                style={{ color: "var(--muted)", fontWeight: 400 }}
              >
                Your month will start on this day each month.
              </span>
            </label>

            <label>
              Budget Alert Threshold
              <select {...financialForm.register("alertThresholdPct")}>
                <option value={50}>50% — Alert at half budget</option>
                <option value={75}>75% — Alert at three-quarters</option>
                <option value={80}>80% — Default threshold</option>
                <option value={90}>90% — Alert near limit</option>
              </select>
            </label>

            <label>
              Currency Formatting
              <select disabled>
                <option>System default ({user?.currency})</option>
              </select>
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 11,
                  display: "block",
                  marginTop: 6,
                }}
              >
                Formatting follows your preferred currency setting.
              </span>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="button primary"
                disabled={financialForm.formState.isSubmitting}
              >
                {financialForm.formState.isSubmitting
                  ? "Saving…"
                  : "Save financial settings"}
              </button>
            </div>
          </form>
        )}

        {/* ── Security Tab ── */}
        {tab === "security" && (
          <div
            className="panel-body"
            style={{ display: "flex", flexDirection: "column", gap: 28 }}
          >
            {/* Change Password */}
            <div>
              <h2 style={{ marginBottom: 16 }}>Change password</h2>
              <form
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
                onSubmit={passwordForm.handleSubmit(async (values) => {
                  try {
                    await api.post("/users/me/password", {
                      currentPassword: values.currentPassword,
                      newPassword: values.newPassword,
                    });
                    toast.success("Password changed successfully");
                    passwordForm.reset();
                  } catch (e: any) {
                    toast.error(
                      e?.response?.data?.error || "Could not change password",
                    );
                  }
                })}
              >
                <label>
                  Current password
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrent ? "text" : "password"}
                      {...passwordForm.register("currentPassword")}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <span className="field-error">
                      {passwordForm.formState.errors.currentPassword.message}
                    </span>
                  )}
                </label>

                <label>
                  New password
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNew ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      onClick={() => setShowNew((v) => !v)}
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {watchedNew && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 4,
                          background: "var(--hover)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${strength.pct}%`,
                            background: strength.color,
                            transition: "width 0.3s, background 0.3s",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: strength.color,
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}
                  {passwordForm.formState.errors.newPassword && (
                    <span className="field-error">
                      {passwordForm.formState.errors.newPassword.message}
                    </span>
                  )}
                </label>

                <label>
                  Confirm new password
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      {...passwordForm.register("confirmPassword")}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <span className="field-error">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </span>
                  )}
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="button primary"
                    disabled={passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting
                      ? "Updating…"
                      : "Update password"}
                  </button>
                </div>
              </form>
            </div>

            {/* Recent activity */}
            <div>
              <h2 style={{ marginBottom: 12 }}>Recent activity</h2>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="panel" style={{ overflow: "hidden" }}>
                  {auditLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="settings-row"
                      style={{ fontSize: 11 }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <b style={{ fontWeight: 550 }}>{log.action}</b>
                      <span
                        style={{
                          color: "var(--muted)",
                          fontFamily: "monospace",
                          fontSize: 10,
                        }}
                      >
                        {log.ipAddress}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 12 }}>
                  No recent activity recorded.
                </p>
              )}
            </div>

            {/* Export + Categories */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    const r = await api.get(
                      "/transactions/export?format=xlsx",
                      {
                        responseType: "blob",
                      },
                    );
                    const url = URL.createObjectURL(r.data as Blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "my-transactions.xlsx";
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    toast.error("Export failed");
                  }
                }}
              >
                Export my data
              </button>
              <Link className="button secondary" to="/categories">
                Manage categories <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Danger zone */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 24,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <AlertTriangle size={16} style={{ color: "var(--expense)" }} />
                <h2 style={{ color: "var(--expense)" }}>Danger zone</h2>
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 12,
                  marginBottom: 16,
                }}
              >
                Permanently delete your account and all associated data. This
                cannot be undone.
              </p>
              <button
                className="button danger"
                onClick={() => setDeleteOpen(true)}
              >
                Delete my account
              </button>
            </div>

            {/* Sign out */}
            <div
              style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}
            >
              <button
                className="button secondary"
                onClick={() => void logout()}
              >
                Sign out of workspace
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Delete account confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This will permanently remove your account, all transactions, budgets, and goals. There is no undo."
      >
        <div className="dialog-body">
          <p style={{ color: "var(--expense)", fontSize: 12 }}>
            ⚠ This action is irreversible.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await api.delete("/users/me");
                  void logout();
                } catch {
                  toast.error(
                    "Could not delete account. Please contact support.",
                  );
                }
              }}
            >
              Yes, delete everything
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
