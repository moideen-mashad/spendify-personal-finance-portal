import type { BudgetActual } from "../../types/finance";
import { money } from "../../utils/format";
export function BudgetProgress({
  budget,
  currency,
}: {
  budget: BudgetActual;
  currency?: string;
}) {
  const p = Number(budget.utilisationPercent);
  return (
    <div className="budget-progress">
      <div className="budget-heading">
        <b>{budget.categoryName}</b>
        <span>
          {money(budget.spent, currency)}{" "}
          <small>/ {money(budget.limit, currency)}</small>
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={budget.categoryName}
        aria-valuenow={Math.min(p, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={
            p >= 100 ? "fill expense" : p >= 80 ? "fill warning" : "fill income"
          }
          style={{ width: `${Math.min(p, 100)}%` }}
        />
        <i className="threshold" style={{ left: "80%" }} />
        <i className="threshold" style={{ left: "99.5%" }} />
      </div>
      <div className="budget-caption">
        <span>
          {budget.remaining < 0
            ? `${money(Math.abs(budget.remaining), currency)} over budget`
            : `${money(budget.remaining, currency)} remaining`}
        </span>
        <b className={p >= 100 ? "expense" : p >= 80 ? "warning" : "income"}>
          {p.toFixed(0)}%
        </b>
      </div>
    </div>
  );
}
