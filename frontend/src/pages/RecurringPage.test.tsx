// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurringPage from "./RecurringPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { currency: "INR" } }),
}));

vi.mock("../hooks/useFinance", () => ({
  useFinance: (path: string) => ({
    data:
      path === "/recurring"
        ? [
            {
              id: 1,
              title: "Test salary",
              txnType: "income",
              amount: 50000,
              frequency: "monthly",
              nextRunDate: "2099-11-30",
              lastRunAt: "2099-10-30T00:00:00Z",
              isActive: true,
              categoryId: 5,
              category: {
                id: 5,
                name: "Salary",
                type: "income",
                color: "#087955",
              },
            },
            {
              id: 2,
              title: "Test new schedule",
              txnType: "expense",
              amount: 100,
              frequency: "monthly",
              nextRunDate: "2099-11-30",
              isActive: true,
              categoryId: 6,
              category: {
                id: 6,
                name: "Utilities",
                type: "expense",
                color: "#777777",
              },
            },
          ]
        : [],
    loading: false,
    error: "",
    reload: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("RecurringPage", () => {
  it("shows the category name returned with a recurring schedule", () => {
    render(<RecurringPage />);

    expect(screen.getByText("Salary", { exact: true })).toBeTruthy();
    const runButtons = screen.getAllByRole("button", { name: "Post Now" });
    expect(runButtons[0].hasAttribute("disabled")).toBe(true);
    expect(runButtons[1].hasAttribute("disabled")).toBe(false);
  });

  it("switches between grid and table views without losing schedule actions", async () => {
    const user = userEvent.setup();
    render(<RecurringPage />);

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Edit Test salary" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Post Now" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Table view" }));
    expect(
      screen.getByRole("columnheader", { name: "Schedule Name" }),
    ).toBeTruthy();
  });
});
