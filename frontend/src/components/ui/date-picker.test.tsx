// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker, MonthPicker } from "./date-picker";
afterEach(cleanup);
it("selects a month across years without the native month menu", async () => {
  const change = vi.fn();
  const user = userEvent.setup();
  render(
    <MonthPicker label="Report month" value="2026-11" onValueChange={change} />,
  );
  await user.click(screen.getByRole("button", { name: "Report month" }));
  expect(
    screen.getByRole("button", { name: "Nov" }).getAttribute("aria-pressed"),
  ).toBe("true");
  await user.click(screen.getByRole("button", { name: "Next year" }));
  await user.click(screen.getByRole("button", { name: "Feb" }));
  expect(change).toHaveBeenCalledWith("2027-02");
  expect(screen.queryByRole("group", { name: "Months in 2027" })).toBeNull();
});
it("disables dates outside range and returns an ISO date", async () => {
  const change = vi.fn();
  const user = userEvent.setup();
  render(
    <DatePicker
      label="Start date"
      value="2026-11-15"
      min="2026-11-10"
      max="2026-11-20"
      onValueChange={change}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Start date" }));
  const ninth = screen.getByRole("button", {
    name: /Monday, November 9th, 2026/,
  });
  expect(ninth.hasAttribute("disabled")).toBe(true);
  await user.click(
    screen.getByRole("button", { name: /Monday, November 16th, 2026/ }),
  );
  expect(change).toHaveBeenCalledWith("2026-11-16");
});
