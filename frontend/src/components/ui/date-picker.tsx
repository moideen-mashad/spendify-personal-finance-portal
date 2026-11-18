import { forwardRef, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { addMonths, format, isValid, parseISO, startOfMonth } from "date-fns";

function parse(value?: string) {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}
interface MonthProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}
export function MonthPicker({
  value,
  onValueChange,
  label,
  className = "",
  disabled,
}: MonthProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(
    () => parse(value)?.getFullYear() || new Date().getFullYear(),
  );
  const grid = useRef<HTMLDivElement>(null);
  const selected = parse(value);
  const today = new Date();
  const select = (month: number) => {
    onValueChange(format(new Date(year, month, 1), "yyyy-MM"));
    setOpen(false);
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setYear(selected?.getFullYear() || today.getFullYear());
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`date-trigger ${className}`}
          aria-label={label}
          disabled={disabled}
        >
          <CalendarDays size={16} />
          <span>
            {selected ? format(selected, "MMMM yyyy") : "Select month"}
          </span>
          <ChevronDown size={14} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="calendar-popover month-popover"
          sideOffset={8}
          collisionPadding={12}
          aria-label={label}
        >
          <div className="calendar-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Previous year"
              disabled={year <= 100}
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <strong aria-live="polite">{year}</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Next year"
              disabled={year >= 9998}
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div
            className="month-grid"
            ref={grid}
            role="group"
            aria-label={`Months in ${year}`}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const active =
                selected?.getFullYear() === year && selected.getMonth() === i;
              return (
                <button
                  key={i}
                  type="button"
                  className="month-cell"
                  aria-pressed={active}
                  data-current={
                    today.getFullYear() === year && today.getMonth() === i
                  }
                  onClick={() => select(i)}
                  onKeyDown={(e) => {
                    const step = {
                      ArrowRight: 1,
                      ArrowLeft: -1,
                      ArrowDown: 3,
                      ArrowUp: -3,
                    }[e.key];
                    if (step !== undefined) {
                      e.preventDefault();
                      const buttons =
                        grid.current?.querySelectorAll<HTMLButtonElement>(
                          "button",
                        );
                      buttons?.[(i + step + 12) % 12]?.focus();
                    }
                  }}
                >
                  {format(new Date(year, i, 1), "MMM")}
                  {active && <Check size={11} />}
                </button>
              );
            })}
          </div>
          <div className="calendar-footer">
            <span>Select a reporting month</span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onValueChange(format(today, "yyyy-MM"));
                setOpen(false);
              }}
            >
              This month
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface DateProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
  disabled?: boolean;
}
export const DatePicker = forwardRef<HTMLButtonElement, DateProps>(
  function DatePicker(
    {
      value,
      onValueChange,
      label,
      placeholder = "Choose a date",
      min,
      max,
      clearable = false,
      invalid,
      describedBy,
      onBlur,
      disabled,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(() =>
      startOfMonth(parse(value) || new Date()),
    );
    const selected = parse(value);
    const before = parse(min),
      after = parse(max);
    const today = new Date();
    const todayString = format(today, "yyyy-MM-dd");
    const todayAllowed =
      (!min || todayString >= min) && (!max || todayString <= max);
    const choose = (d: Date | undefined) => {
      if (d) {
        onValueChange(format(d, "yyyy-MM-dd"));
        setOpen(false);
      }
    };
    return (
      <Popover.Root
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v) setMonth(startOfMonth(selected || before || new Date()));
          else onBlur?.();
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            ref={ref}
            className="date-trigger"
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            data-placeholder={!selected}
            disabled={disabled}
          >
            <CalendarDays size={16} />
            <span>
              {selected ? format(selected, "dd MMM yyyy") : placeholder}
            </span>
            <ChevronDown size={14} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="calendar-popover"
            sideOffset={8}
            collisionPadding={12}
            aria-label={label}
          >
            <div className="calendar-navigation">
              <button
                className="icon-button"
                type="button"
                aria-label="Previous month"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeft size={17} />
              </button>
              <MonthPicker
                value={format(month, "yyyy-MM")}
                onValueChange={(v) => setMonth(parseISO(v + "-01"))}
                label="Choose calendar month and year"
                className="calendar-caption"
              />
              <button
                className="icon-button"
                type="button"
                aria-label="Next month"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={choose}
              month={month}
              onMonthChange={setMonth}
              hideNavigation
              showOutsideDays
              fixedWeeks
              weekStartsOn={1}
              disabled={[
                ...(before ? [{ before }] : []),
                ...(after ? [{ after }] : []),
              ]}
              classNames={{
                root: "date-calendar",
                months: "calendar-months",
                month: "calendar-month",
                month_caption: "calendar-hidden-caption",
                month_grid: "calendar-grid",
                weekdays: "calendar-weekdays",
                weekday: "calendar-weekday",
                week: "calendar-week",
                day: "calendar-day",
                day_button: "calendar-day-button",
                selected: "calendar-selected",
                today: "calendar-today",
                outside: "calendar-outside",
                disabled: "calendar-disabled",
              }}
            />
            <div className="calendar-footer">
              {clearable ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                >
                  Clear date
                </button>
              ) : (
                <span>Pick a day</span>
              )}
              <button
                className="text-button"
                type="button"
                disabled={!todayAllowed}
                onClick={() => choose(today)}
              >
                Today
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);
