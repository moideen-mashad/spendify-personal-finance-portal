function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={"skeleton bone " + className} />;
}
export function TableSkeleton() {
  return (
    <div
      className="table-skeleton"
      role="status"
      aria-label="Loading transactions"
      aria-busy="true"
    >
      <div className="skeleton-table-head">
        <Bone />
        <Bone />
        <Bone />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton-table-row" key={i}>
          <Bone className="bone-avatar" />
          <div className="bone-description">
            <Bone />
            <Bone className="bone-short" />
          </div>
          <Bone className="bone-category" />
          <Bone className="bone-amount" />
        </div>
      ))}
      <div className="skeleton-table-head">
        <Bone />
        <Bone />
      </div>
    </div>
  );
}
export function ChartSkeleton() {
  return (
    <div
      className="chart-skeleton"
      role="status"
      aria-label="Loading chart"
      aria-busy="true"
    >
      <div className="chart-skeleton-lines">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} />
        ))}
      </div>
      <div className="chart-skeleton-bars">
        {[36, 60, 44, 82, 66, 92, 72, 58].map((h, i) => (
          <Bone key={i} className={`bar-${i}`} />
        ))}
      </div>
      <div className="chart-skeleton-axis">
        <Bone />
        <Bone />
        <Bone />
        <Bone />
      </div>
    </div>
  );
}
export function BudgetSkeleton() {
  return (
    <div
      className="budget-skeleton"
      role="status"
      aria-label="Loading budgets"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Bone />
          <Bone className="bone-track" />
          <Bone className="bone-short" />
        </div>
      ))}
    </div>
  );
}
export function PageSkeleton({
  kind = "overview",
}: {
  kind?: "overview" | "table" | "settings" | "auth";
}) {
  return (
    <div
      className={"page-skeleton " + (kind === "auth" ? "auth-skeleton" : "")}
      role="status"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="skeleton-page-heading">
        <Bone className="bone-short" />
        <Bone className="bone-title" />
        <Bone />
      </div>
      {kind === "table" ? (
        <div className="panel">
          <TableSkeleton />
        </div>
      ) : kind === "settings" || kind === "auth" ? (
        <div className="panel panel-body">
          <BudgetSkeleton />
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {[1, 2, 3, 4].map((i) => (
              <div className="kpi-card" key={i}>
                <Bone />
                <Bone className="bone-title" />
                <Bone className="bone-short" />
              </div>
            ))}
          </div>
          <div className="chart-grid">
            <div className="panel">
              <ChartSkeleton />
            </div>
            <div className="panel">
              <ChartSkeleton />
            </div>
          </div>
          <div className="panel">
            <TableSkeleton />
          </div>
        </>
      )}
    </div>
  );
}
export function AppSkeleton() {
  return (
    <div className="app-loading">
      <div className="app-loading-sidebar" aria-hidden="true">
        <Bone className="bone-title" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} />
        ))}
      </div>
      <div className="app-loading-main">
        <div className="app-loading-header">
          <Bone />
        </div>
        <PageSkeleton />
      </div>
    </div>
  );
}
