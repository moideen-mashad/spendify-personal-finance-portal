// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import api from "../api/client";
import CategoriesPage from "./CategoriesPage";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CategoriesPage", () => {
  it("switches both category groups between grid and table views", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Food",
          type: "expense",
          color: "#EF4444",
          icon: "utensils",
        },
        {
          id: 2,
          name: "Salary",
          type: "income",
          color: "#10B981",
          icon: "wallet",
        },
      ],
    });
    const user = userEvent.setup();
    render(<CategoriesPage />);

    expect(await screen.findByText("Food")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Table view" }));

    expect(
      screen.getAllByRole("columnheader", { name: "Category" }),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Edit Food" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Salary" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(
      screen.queryAllByRole("columnheader", { name: "Category" }),
    ).toHaveLength(0);
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getByText("Salary")).toBeTruthy();
  });

  it("blocks a case-insensitive duplicate category of the same type", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Food",
          type: "expense",
          color: "#EF4444",
          icon: "utensils",
        },
      ],
    });
    const user = userEvent.setup();
    render(<CategoriesPage />);

    await user.click(
      await screen.findByRole("button", { name: "Add Expense Category" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Category Name" }),
      " food ",
    );
    await user.click(screen.getByRole("button", { name: "Create Category" }));

    expect(api.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "A category with this name and type already exists.",
    );
  });
});
