import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "./dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description=""
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: variant === "danger" ? "#bd354f15" : "var(--hover)",
              color: variant === "danger" ? "var(--expense)" : "var(--accent)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {variant === "danger" ? (
              <AlertTriangle size={20} />
            ) : (
              <Trash2 size={20} />
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {description}
            </p>
          </div>
        </div>

        <div className="dialog-footer" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`button ${variant === "danger" ? "danger" : "primary"}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
