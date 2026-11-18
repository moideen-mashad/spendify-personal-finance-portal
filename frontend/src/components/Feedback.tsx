import { Inbox, RefreshCw } from "lucide-react";
export function EmptyState({
  title = "A fresh start for your finances",
  description = "Your activity will appear here once you add a transaction.",
  action,
  onAction,
}: {
  title?: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button secondary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      <button className="button secondary" onClick={onRetry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
export function Skeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height }}
      role="status"
      aria-label="Loading information"
    />
  );
}
