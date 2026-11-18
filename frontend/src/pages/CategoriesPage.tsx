import { useState } from "react";
import { Plus, Edit2, Trash2, LayoutGrid, Table } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import api from "../api/client";
import { useFinance } from "../hooks/useFinance";
import type { Category } from "../types";
import {
  CATEGORY_ICONS,
  getCategoryIcon,
} from "../components/categories/categoryIcons";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState, Skeleton } from "../components/Feedback";
import { usePersistentView } from "../hooks/usePersistentView";

const PALETTE = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#64748B", // Slate
  "#84CC16", // Lime
];

type CategoryView = "grid" | "table";

function CategoryList({
  categories,
  type,
  view,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  type: Category["type"];
  view: CategoryView;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  if (view === "table") {
    return (
      <div className="panel category-table-wrap">
        <table className="category-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th className="category-actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const IconComponent = getCategoryIcon(category.icon);
              return (
                <tr key={category.id}>
                  <td>
                    <div className="category-table-name">
                      <span
                        className="category-icon-badge"
                        style={{
                          background: `${category.color}18`,
                          color: category.color,
                        }}
                      >
                        <IconComponent size={18} />
                      </span>
                      <b>{category.name}</b>
                    </div>
                  </td>
                  <td>
                    <span className="category-type-label">
                      {type === "expense" ? "Expense" : "Income"}
                    </span>
                  </td>
                  <td>
                    <div className="category-row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => onEdit(category)}
                        title="Edit category"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => onDelete(category)}
                        title="Delete category"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="category-grid">
      {categories.map((category) => {
        const IconComponent = getCategoryIcon(category.icon);
        return (
          <div key={category.id} className="panel category-card">
            <div className="category-card-details">
              <span
                className="category-icon-badge"
                style={{
                  background: `${category.color}18`,
                  color: category.color,
                }}
              >
                <IconComponent size={19} />
              </span>
              <div>
                <b>{category.name}</b>
                <small className="subtle">
                  {type === "expense" ? "Expense" : "Income"}
                </small>
              </div>
            </div>
            <div className="category-row-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => onEdit(category)}
                title="Edit category"
                aria-label={`Edit ${category.name}`}
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onDelete(category)}
                title="Delete category"
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoriesPage() {
  const {
    data: categories,
    loading,
    error,
    reload,
  } = useFinance<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [view, setView] = usePersistentView("spendify:view:categories", "grid");

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [color, setColor] = useState("#6366F1");
  const [icon, setIcon] = useState("circle");

  const openCreate = (defaultType: "expense" | "income" = "expense") => {
    setEditing(null);
    setName("");
    setType(defaultType);
    setColor(defaultType === "income" ? "#10B981" : "#EF4444");
    setIcon("circle");
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || "#6366F1");
    setIcon(cat.icon || "circle");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    const duplicate = (categories || []).some(
      (category) =>
        category.id !== editing?.id &&
        category.type === type &&
        category.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicate) {
      toast.error("A category with this name and type already exists.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        color,
        icon,
      };

      const response = editing
        ? await api.put<Category>(`/categories/${editing.id}`, payload)
        : await api.post<Category>("/categories", payload);
      const previousIcon = editing?.icon || "circle";
      const iconChanged = editing ? icon !== previousIcon : icon !== "circle";
      if (iconChanged && response.data.icon !== icon) {
        toast.error(
          "The server did not save the selected icon. Restart the backend and try again.",
        );
        return;
      }
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      reload();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error("A category with this name and type already exists.");
      } else {
        toast.error("Could not save category. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/categories/${deletingCat.id}`);
      toast.success("Category deleted");
      setDeletingCat(null);
      reload();
    } catch {
      toast.error("Cannot delete category currently linked to transactions");
    } finally {
      setDeleteBusy(false);
    }
  };

  const expenseCategories = (categories || []).filter(
    (c) => c.type === "expense",
  );
  const incomeCategories = (categories || []).filter(
    (c) => c.type === "income",
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TAXONOMY & LABELS</div>
          <h1>
            Categories<span className="title-dot">.</span>
          </h1>
          <p>
            Organize spending and cash inflows with icons and custom palettes.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button primary"
            onClick={() => openCreate("expense")}
          >
            <Plus size={16} /> New Category
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton height={280} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Expense Categories */}
          <section>
            <div className="category-section-heading">
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                  Expense Categories
                </h2>
                <small className="subtle">
                  Outflows, bills, shopping, lifestyle
                </small>
              </div>
              <div className="category-section-actions">
                <div
                  className="view-toggle"
                  role="group"
                  aria-label="Category view"
                >
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
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => openCreate("expense")}
                >
                  <Plus size={14} /> Add Expense Category
                </button>
              </div>
            </div>

            <CategoryList
              categories={expenseCategories}
              type="expense"
              view={view}
              onEdit={openEdit}
              onDelete={setDeletingCat}
            />
          </section>

          {/* Income Categories */}
          <section>
            <div className="category-section-heading">
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                  Income Categories
                </h2>
                <small className="subtle">
                  Salaries, freelance, dividends, sales
                </small>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => openCreate("income")}
              >
                <Plus size={14} /> Add Income Category
              </button>
            </div>

            <CategoryList
              categories={incomeCategories}
              type="income"
              view={view}
              onEdit={openEdit}
              onDelete={setDeletingCat}
            />
          </section>
        </div>
      )}

      {/* Dialog for Add/Edit Category */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Category" : "Create Category"}
        description="Choose a distinct icon and color badge for this transaction label."
      >
        <form onSubmit={handleSubmit} className="dialog-form">
          <div className="segmented" style={{ marginBottom: 4 }}>
            <button
              type="button"
              className={type === "expense" ? "selected" : ""}
              onClick={() => setType("expense")}
            >
              Expense
            </button>
            <button
              type="button"
              className={type === "income" ? "selected" : ""}
              onClick={() => setType("income")}
            >
              Income
            </button>
          </div>

          <label>
            Category Name
            <input
              required
              placeholder="e.g., Groceries, Uber, Software"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              Select Icon
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 10,
              }}
            >
              {Object.entries(CATEGORY_ICONS).map(([key, IconCmp]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  style={{
                    height: 42,
                    borderRadius: 9,
                    border: `2px solid ${icon === key ? color : "var(--border)"}`,
                    background: icon === key ? `${color}20` : "var(--hover)",
                    color: icon === key ? color : "var(--muted)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={key}
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
              Color Swatch
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PALETTE.map((c) => (
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
              {busy
                ? "Saving…"
                : editing
                  ? "Update Category"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </Dialog>
      <ConfirmDialog
        open={!!deletingCat}
        onOpenChange={(value) => {
          if (!value && !deleteBusy) setDeletingCat(null);
        }}
        title="Delete category?"
        description={
          deletingCat
            ? `Delete "${deletingCat.name}"? Categories linked to transactions cannot be deleted.`
            : ""
        }
        confirmLabel="Delete category"
        loading={deleteBusy}
        onConfirm={handleDelete}
      />
    </>
  );
}
