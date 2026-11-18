import { ArrowDownLeft, ArrowUpRight, Wallet, Activity } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import type { Summary } from "../../types";
import type { Trend } from "../../types/finance";
import { money } from "../../utils/format";
export function KPIOverview({
  summary,
  previous,
  trend,
  currency = "INR",
}: {
  summary: Summary;
  previous?: Summary;
  trend: Trend[];
  currency?: string;
}) {
  const items = [
    {
      label: "Net balance",
      value: summary.balance,
      old: previous?.balance,
      key: "balance",
      icon: Wallet,
      tone: "neutral",
    },
    {
      label: "Monthly income",
      value: summary.totalIncome,
      old: previous?.totalIncome,
      key: "income",
      icon: ArrowDownLeft,
      tone: "income",
    },
    {
      label: "Monthly expenses",
      value: summary.totalExpense,
      old: previous?.totalExpense,
      key: "expense",
      icon: ArrowUpRight,
      tone: "expense",
    },
    {
      label: "Savings rate",
      value: summary.savingsRate,
      old: previous?.savingsRate,
      key: "savingsRate",
      icon: Activity,
      tone: "neutral",
    },
  ];
  return (
    <div className="kpi-grid">
      {items.map((item) => {
        const delta = item.old
          ? ((item.value - item.old) / Math.abs(item.old)) * 100
          : undefined;
        return (
          <article className={"kpi-card " + item.tone} key={item.label}>
            <div className="kpi-label">
              {item.label}
              <item.icon size={17} />
            </div>
            <strong>
              {item.label === "Savings rate"
                ? `${Number(item.value).toFixed(1)}%`
                : money(item.value, currency)}
            </strong>
            <div className="kpi-bottom">
              <div>
                {delta !== undefined ? (
                  <>
                    <span className="delta">
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </span>
                    <small> vs last month</small>
                  </>
                ) : (
                  <small>No prior-period comparison</small>
                )}
              </div>
              <div className="sparkline" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trend.map((point) => ({
                      ...point,
                      savingsRate: Number(point.income)
                        ? ((Number(point.income) - Number(point.expense)) /
                            Number(point.income)) *
                          100
                        : 0,
                    }))}
                  >
                    <Line
                      dataKey={item.key}
                      stroke="currentColor"
                      dot={false}
                      strokeWidth={1.8}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
