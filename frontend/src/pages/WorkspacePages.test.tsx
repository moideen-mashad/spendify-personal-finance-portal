// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetsPage } from "./WorkspacePages";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { currency: "INR" } }),
}));

vi.mock("../hooks/useFinance", () => ({
  useFinance: (path: string) => ({
    data: path.startsWith("/reports")
      ? [
          {
            budgetId: 1,
            categoryId: 4,
            categoryName: "Food & Dining",
            color: "#EF4444",
            limit: 7000,
            spent: 6300,
            remaining: 700,
            utilisationPercent: 90,
            status: "warning",
          },
        ]
      : [],
    loading: false,
    error: "",
    reload: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("BudgetsPage", () => {
  it("switches between grid and table views", async () => {
    const user = userEvent.setup();
    render(<BudgetsPage />);

    expect(
      await screen.findByRole("progressbar", { name: "Food & Dining" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Table view" }));
    expect(screen.getByRole("columnheader", { name: "Spent" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit budget" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(
      screen.getByRole("progressbar", { name: "Food & Dining" }),
    ).toBeTruthy();
  });
});
