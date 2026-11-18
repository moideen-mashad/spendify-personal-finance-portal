import { useState } from "react";
import { MonthPicker } from "../components/ui/date-picker";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, CalendarDays } from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths } from "date-fns";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../context/AuthContext";
import type { Summary } from "../types";
import type {
  Trend,
  Breakdown,
  BudgetActual,
  TransactionPage,
} from "../types/finance";
import { KPIOverview } from "../components/dashboard/KPIOverview";
import { BudgetProgress } from "../components/dashboard/BudgetProgress";
import { Skeleton, EmptyState, ErrorState } from "../components/Feedback";
import {
  ChartSkeleton,
  TableSkeleton,
  BudgetSkeleton,
} from "../components/LoadingStates";
import { SafePanel } from "../components/ErrorBoundary";
import { money, date } from "../utils/format";
const palette = [
  "#4c6987",
  "#859ab1",
  "#b3bfcd",
  "#c9a57f",
  "#7c859c",
  "#a9aaa0",
];
export default function OverviewPage({
  analytics = false,
}: {
  analytics?: boolean;
}) {
  const { user } = useAuth();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [category, setCategory] = useState<number>();
  const [y, m] = month.split("-").map(Number);
  const previous = subMonths(new Date(y, m - 1, 1), 1);
  const summary = useFinance<Summary>(`/reports/summary?month=${m}&year=${y}`);
  const prev = useFinance<Summary>(
    `/reports/summary?month=${previous.getMonth() + 1}&year=${previous.getFullYear()}`,
  );
  const trend = useFinance<Trend[]>("/reports/monthly-trend?months=6");
  const breakdown = useFinance<Breakdown[]>(
    `/reports/category-breakdown?from=${month}-01&to=${format(new Date(y, m, 0), "yyyy-MM-dd")}`,
  );
  const budgets = useFinance<BudgetActual[]>(
    `/reports/budget-vs-actual?month=${m}&year=${y}`,
  );
  const transactions = useFinance<TransactionPage>(
    `/transactions?limit=5&from=${month}-01&to=${format(new Date(y, m, 0), "yyyy-MM-dd")}${category ? "&categoryId=" + category : ""}`,
  );
  const currency = user?.currency;
  const total = breakdown.data?.reduce((s, c) => s + Number(c.total), 0) || 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {analytics ? "THE BIGGER PICTURE" : "YOUR FINANCIAL SNAPSHOT"}
          </div>
          <h1>
            {analytics ? "Analytics & reports" : `A little more clarity`}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {analytics
              ? "Understand your habits. Make room for what matters."
              : `Welcome back${user?.fullName ? ", " + user.fullName.split(" ")[0] : ""}. Here’s how your money is doing.`}
          </p>
        </div>
        <MonthPicker
          label="Report month"
          value={month}
          onValueChange={setMonth}
          className="month-control"
        />
      </div>
      {summary.loading ? (
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={154} />
          ))}
        </div>
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        summary.data && (
          <KPIOverview
            summary={summary.data}
            previous={prev.data}
            trend={trend.data || []}
            currency={currency}
          />
        )
      )}
      <div className="chart-grid">
        <SafePanel>
          <div className="section-heading">
            <div>
              <h2>Cash flow</h2>
              <p>Your income and spending, side by side</p>
            </div>
            <span className="pill">Last 6 months</span>
          </div>
          <div className="chart-legend">
            <span>
              <i style={{ background: "#168364" }} />
              Income
            </span>
            <span>
              <i style={{ background: "#c65a6d" }} />
              Expenses
            </span>
          </div>
          {trend.loading ? (
            <ChartSkeleton />
          ) : trend.error ? (
            <ErrorState message={trend.error} onRetry={trend.reload} />
          ) : !trend.data?.some(
              (t) => Number(t.income) || Number(t.expense),
            ) ? (
            <EmptyState
              title="Your story starts here"
              description="Add a transaction to start seeing your cash flow."
            />
          ) : (
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={trend.data}
                  margin={{ top: 15, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="income-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#168364" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#168364" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    vertical={false}
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={(v) => `${Number(v) / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--text)",
                    }}
                    formatter={(v: number) => money(v, currency)}
                  />
                  <Area
                    name="Income"
                    type="monotone"
                    dataKey="income"
                    stroke="#168364"
                    strokeWidth={2.5}
                    fill="url(#income-fill)"
                  />
                  <Area
                    name="Expenses"
                    type="monotone"
                    dataKey="expense"
                    stroke="#c65a6d"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SafePanel>
        <SafePanel>
          <div className="section-heading">
            <div>
              <h2>Where it went</h2>
              <p>Spending by category</p>
            </div>
            <ArrowUpRight size={19} />
          </div>
          {breakdown.loading ? (
            <ChartSkeleton />
          ) : breakdown.error ? (
            <ErrorState message={breakdown.error} onRetry={breakdown.reload} />
          ) : !total ? (
            <EmptyState
              title="Nothing spent yet"
              description="Your expense categories will appear here."
            />
          ) : (
            <>
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={breakdown.data}
                      dataKey="total"
                      innerRadius={64}
                      outerRadius={86}
                      paddingAngle={4}
                      stroke="none"
                      onClick={(d: Breakdown) =>
                        setCategory(
                          category === d.categoryId ? undefined : d.categoryId,
                        )
                      }
                    >
                      {breakdown.data?.map((c, i) => (
                        <Cell
                          key={c.categoryId}
                          fill={palette[i % palette.length]}
                          opacity={
                            category && category !== c.categoryId ? 0.45 : 1
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => money(v, currency)}
                      contentStyle={{
                        background: "var(--panel)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-label">
                  <small>Total spent</small>
                  <b>{money(total, currency)}</b>
                </div>
              </div>
              <div className="category-legend">
                {breakdown.data?.map((c, i) => (
                  <button
                    aria-pressed={category === c.categoryId}
                    key={c.categoryId}
                    onClick={() =>
                      setCategory(
                        category === c.categoryId ? undefined : c.categoryId,
                      )
                    }
                  >
                    <span>
                      <i style={{ background: palette[i % palette.length] }} />
                      {c.name}
                    </span>
                    <b>{Number(c.percent).toFixed(0)}%</b>
                  </button>
                ))}
              </div>
            </>
          )}
        </SafePanel>
      </div>
      <div className="lower-grid">
        <SafePanel>
          <div className="section-heading">
            <div>
              <h2>
                Recent activity{" "}
                {category && (
                  <button
                    className="text-button"
                    onClick={() => setCategory(undefined)}
                  >
                    Clear category
                  </button>
                )}
              </h2>
              <p>The latest movements in your money</p>
            </div>
            <Link className="text-link" to="/transactions">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {transactions.loading ? (
            <TableSkeleton />
          ) : transactions.error ? (
            <ErrorState
              message={transactions.error}
              onRetry={transactions.reload}
            />
          ) : !transactions.data?.data.length ? (
            <EmptyState />
          ) : (
            <div className="recent-list">
              {transactions.data.data.map((t) => (
                <Link
                  to={`/transactions?q=${encodeURIComponent(t.description)}`}
                  key={t.id}
                  className="recent-row"
                >
                  <span className="merchant-icon">
                    {(t.description || t.categoryName).slice(0, 1)}
                  </span>
                  <div>
                    <b>{t.description || t.categoryName}</b>
                    <small>
                      {t.categoryName} · {date(t.txnDate)}
                    </small>
                  </div>
                  <b
                    className={
                      t.categoryType === "income" ? "income" : "expense"
                    }
                  >
                    {t.categoryType === "income" ? "+" : "−"}
                    {money(t.amount, currency)}
                  </b>
                </Link>
              ))}
            </div>
          )}
        </SafePanel>
        <SafePanel>
          <div className="section-heading">
            <div>
              <h2>Budget check-in</h2>
              <p>A little structure. More freedom.</p>
            </div>
            <Link
              className="icon-button"
              aria-label="View budgets"
              to="/budgets"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="panel-body">
            {budgets.loading ? (
              <BudgetSkeleton />
            ) : budgets.error ? (
              <ErrorState message={budgets.error} onRetry={budgets.reload} />
            ) : !budgets.data?.length ? (
              <EmptyState
                title="Make room for your goals"
                description="Your monthly budgets will appear here."
              />
            ) : (
              budgets.data
                .slice(0, 4)
                .map((b) => (
                  <BudgetProgress
                    budget={b}
                    key={b.budgetId}
                    currency={currency}
                  />
                ))
            )}
          </div>
        </SafePanel>
      </div>
    </>
  );
}
