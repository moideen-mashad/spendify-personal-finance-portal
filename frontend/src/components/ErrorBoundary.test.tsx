// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("isolates a render failure and remounts a recovered component on retry", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let broken = true;
  function Widget() {
    if (broken) throw new Error("Test render failure");
    return <p>Chart ready</p>;
  }
  render(
    <>
      <p>Other panels remain visible</p>
      <ErrorBoundary name="Chart">
        <Widget />
      </ErrorBoundary>
    </>,
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Chart couldn’t be displayed",
  );
  expect(screen.getByText("Other panels remain visible")).toBeTruthy();
  broken = false;
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText("Chart ready")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
