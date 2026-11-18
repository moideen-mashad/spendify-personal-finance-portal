import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, CalendarDays } from "lucide-react";
import type { Category } from "../../types";
import { Dialog } from "../ui/dialog";
import { DatePicker } from "../ui/date-picker";
import { format, startOfMonth, subDays } from "date-fns";
export interface Filters {
  q: string;
  type: string;
  categories: string[];
  min: string;
  max: string;
  from: string;
  to: string;
}
export const emptyFilters: Filters = {
  q: "",
  type: "all",
  categories: [],
  min: "",
  max: "",
  from: "",
  to: "",
};
export function FacetedFilterBar({
  filters,
  onChange,
  categories,
  counts,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: Category[];
  counts: Record<number, number>;
}) {
  const [draft, setDraft] = useState(filters.q);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(filters.q), [filters.q]);
  useEffect(() => {
    if (draft === filters.q) return;
    const timer = setTimeout(() => onChange({ ...filters, q: draft }), 300);
    return () => clearTimeout(timer);
  }, [draft, filters, onChange]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(
          e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,[contenteditable]")
        )
      ) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const change = (x: Partial<Filters>) => onChange({ ...filters, ...x });
  const extra = (
    <>
      <details className="filter-popover">
        <summary>
          Categories{" "}
          {filters.categories.length > 0 && `(${filters.categories.length})`}
        </summary>
        <div className="popover-panel">
          <input
            aria-label="Search categories"
            placeholder="Find category…"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
          />
          {categories
            .filter((c) =>
              c.name.toLowerCase().includes(categoryQuery.toLowerCase()),
            )
            .map((c) => (
              <label className="category-option" key={c.id}>
                <input
                  type="checkbox"
                  checked={filters.categories.includes(String(c.id))}
                  onChange={(e) =>
                    change({
                      categories: e.target.checked
                        ? [...filters.categories, String(c.id)]
                        : filters.categories.filter(
                            (id) => id !== String(c.id),
                          ),
                    })
                  }
                />
                <span
                  className="category-dot"
                  style={{ background: c.color }}
                />
                {c.name}
                <small>{counts[c.id] || 0}</small>
              </label>
            ))}
        </div>
      </details>
      <details className="filter-popover">
        <summary>Amount range</summary>
        <div className="popover-panel">
          <div className="input-pair">
            <label>
              Min
              <input
                type="number"
                min="0"
                value={filters.min}
                onChange={(e) => change({ min: e.target.value })}
              />
            </label>
            <label>
              Max
              <input
                type="number"
                min="0"
                value={filters.max}
                onChange={(e) => change({ max: e.target.value })}
              />
            </label>
          </div>
          <div className="preset-row">
            {[
              ["Under 50", "", "50"],
              ["50–500", "50", "500"],
              ["Over 500", "500", ""],
            ].map(([label, min, max]) => (
              <button
                className="chip"
                key={label}
                onClick={() => change({ min, max })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details className="filter-popover">
        <summary>
          <CalendarDays size={14} />
          Date range
        </summary>
        <div className="popover-panel">
          <label>
            From
            <DatePicker
              label="From date"
              value={filters.from}
              max={filters.to}
              clearable
              onValueChange={(v) => change({ from: v })}
            />
          </label>
          <label>
            To
            <DatePicker
              label="To date"
              value={filters.to}
              min={filters.from}
              clearable
              onValueChange={(v) => change({ to: v })}
            />
          </label>
          <div className="calendar-presets">
            <button
              type="button"
              onClick={() =>
                change({
                  from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                  to: format(new Date(), "yyyy-MM-dd"),
                })
              }
            >
              This month
            </button>
            <button
              type="button"
              onClick={() =>
                change({
                  from: format(subDays(new Date(), 29), "yyyy-MM-dd"),
                  to: format(new Date(), "yyyy-MM-dd"),
                })
              }
            >
              Last 30 days
            </button>
            <button type="button" onClick={() => change({ from: "", to: "" })}>
              All dates
            </button>
          </div>
        </div>
      </details>
    </>
  );
  const active =
    filters.q ||
    filters.type !== "all" ||
    filters.categories.length ||
    filters.min ||
    filters.max ||
    filters.from ||
    filters.to;
  return (
    <div className="filter-bar">
      <div className="filter-top">
        <div className="segmented" aria-label="Transaction type">
          {["all", "income", "expense"].map((t) => (
            <button
              aria-pressed={filters.type === t}
              className={filters.type === t ? "selected" : ""}
              key={t}
              onClick={() => change({ type: t })}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            ref={ref}
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft ? (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => {
                setDraft("");
                change({ q: "" });
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>
      </div>
      <div className="filter-bottom">
        <div className="desktop-filters">{extra}</div>
        <button
          className="button secondary mobile-only"
          onClick={() => setMobile(true)}
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
        <span className="subtle">Make your money make sense.</span>
      </div>
      {active && (
        <div className="filter-chips">
          {filters.q && (
            <button className="chip" onClick={() => change({ q: "" })}>
              Search: {filters.q}
              <X size={12} />
            </button>
          )}
          {filters.categories.map((id) => (
            <button
              className="chip"
              key={id}
              onClick={() =>
                change({
                  categories: filters.categories.filter((v) => v !== id),
                })
              }
            >
              {categories.find((c) => String(c.id) === id)?.name || id}
              <X size={12} />
            </button>
          ))}
          {(["type", "min", "max", "from", "to"] as const)
            .filter((k) => filters[k] && filters[k] !== "all")
            .map((k) => (
              <button
                className="chip"
                key={k}
                onClick={() => change({ [k]: k === "type" ? "all" : "" })}
              >
                {k}: {filters[k]}
                <X size={12} />
              </button>
            ))}
          <button
            className="text-button"
            onClick={() => onChange(emptyFilters)}
          >
            Reset all filters
          </button>
        </div>
      )}
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="Filter transactions"
        description="Narrow down your activity."
      >
        <div className="mobile-filters">
          {extra}
          <button className="button primary" onClick={() => setMobile(false)}>
            Show results
          </button>
        </div>
      </Dialog>
    </div>
  );
}
