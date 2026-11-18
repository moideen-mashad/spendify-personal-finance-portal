import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  startOfYear,
  startOfQuarter,
  subQuarters,
  endOfQuarter,
  subDays,
} from "date-fns";
import { Dialog } from "./ui/dialog";
import { Select } from "./ui/select";
import { DatePicker } from "./ui/date-picker";
export function DateRangeSelector() {
  const navigate = useNavigate();
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const go = (a: string, b: string) => {
    navigate(`/transactions?from=${a}&to=${b}&page=1`);
    setCustom(false);
  };
  return (
    <>
      <Select
        className="global-range desktop-only"
        label="View transactions for date range"
        placeholder="Date range"
        value=""
        onValueChange={(value) => {
          const now = new Date();
          const prev = subQuarters(now, 1);
          if (value === "custom") {
            setCustom(true);
            return;
          }
          const start =
            value === "month"
              ? startOfMonth(now)
              : value === "30"
                ? subDays(now, 29)
                : value === "quarter"
                  ? startOfQuarter(prev)
                  : startOfYear(now);
          const end = value === "quarter" ? endOfQuarter(prev) : now;
          go(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
        }}
        options={[
          { value: "month", label: "This month" },
          { value: "30", label: "Last 30 days" },
          { value: "quarter", label: "Last quarter" },
          { value: "year", label: "Year to date" },
          {
            value: "custom",
            label: "Custom range",
            description: "Choose your own start and end dates",
          },
        ]}
      />
      <Dialog
        open={custom}
        onOpenChange={setCustom}
        title="Choose a date range"
        description="View the transactions recorded during this period."
      >
        <form
          className="dialog-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to && from <= to) go(from, to);
          }}
        >
          <div className="input-pair">
            <label>
              Start date
              <DatePicker
                label="Start date"
                value={from}
                max={to}
                onValueChange={setFrom}
              />
            </label>
            <label>
              End date
              <DatePicker
                label="End date"
                value={to}
                min={from}
                onValueChange={setTo}
              />
            </label>
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setCustom(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!from || !to || from > to}
            >
              View transactions
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
