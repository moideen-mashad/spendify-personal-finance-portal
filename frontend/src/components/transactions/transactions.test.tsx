// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { TransactionsDataTable } from "./TransactionsDataTable";
import { FacetedFilterBar, emptyFilters } from "./FacetedFilterBar";
import { TransactionDrawer } from "./TransactionDrawer";
import api from "../../api/client";
vi.mock("../../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const rows = [
  {
    id: 1,
    description: "Coffee",
    categoryId: 1,
    categoryName: "Food",
    categoryType: "expense",
    categoryColor: "#777777",
    categoryIcon: "coffee",
    amount: 20,
    txnDate: "2026-11-02",
  },
  {
    id: 2,
    description: "Groceries",
    categoryId: 1,
    categoryName: "Food",
    categoryType: "expense",
    categoryColor: "#777777",
    amount: 80,
    txnDate: "2026-11-01",
  },
];
function Table() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [view, setView] = useState<"grid" | "table">("table");
  return (
    <TransactionsDataTable
      rows={rows}
      view={view}
      onViewChange={setView}
      sorting={sorting}
      setSorting={setSorting}
      page={1}
      limit={25}
      onPage={() => {}}
      onLimit={() => {}}
      onClear={() => {}}
      onEdit={() => {}}
    />
  );
}
describe("Transaction UI", () => {
  it("switches to a selectable transaction grid", async () => {
    const user = userEvent.setup();
    render(<Table />);

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("checkbox", { name: "Select Coffee" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("cycles date sorting and exposes bulk selection", async () => {
    const u = userEvent.setup();
    const { container } = render(<Table />);
    const table = screen.getByRole("table");
    expect(table.querySelector("tbody b.expense")).toBeTruthy();
    expect(container.querySelector("svg.lucide-coffee")).toBeTruthy();
    const date = within(table).getByRole("button", { name: "Date" });
    await u.click(date);
    expect(within(table).getAllByRole("row")[1].textContent).toContain(
      "Groceries",
    );
    await u.click(date);
    expect(within(table).getAllByRole("row")[1].textContent).toContain(
      "Coffee",
    );
    await u.click(date);
    expect(
      within(table)
        .getByRole("columnheader", { name: "Date" })
        .getAttribute("aria-sort"),
    ).toBe("none");
    await u.click(
      within(table).getByRole("checkbox", { name: "Select current page" }),
    );
    expect(screen.getByText("2 selected")).toBeTruthy();
  });
  it("debounces search before changing filters", async () => {
    const change = vi.fn();
    const u = userEvent.setup();
    render(
      <FacetedFilterBar
        filters={emptyFilters}
        onChange={change}
        categories={[]}
        counts={{}}
      />,
    );
    await u.type(
      screen.getByRole("textbox", { name: "Search transactions" }),
      "coffee",
    );
    expect(change).not.toHaveBeenCalled();
    await waitFor(
      () =>
        expect(change).toHaveBeenCalledWith({ ...emptyFilters, q: "coffee" }),
      { timeout: 1200 },
    );
  });
  it("validates the drawer without submitting invalid money", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 1, name: "Food", type: "expense", color: "#777777" }],
    });
    const u = userEvent.setup();
    render(<TransactionDrawer open onClose={() => {}} onSaved={() => {}} />);
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Save transaction" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    await u.click(screen.getByRole("button", { name: "Save transaction" }));
    expect(
      await screen.findByText("Enter an amount greater than zero"),
    ).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
