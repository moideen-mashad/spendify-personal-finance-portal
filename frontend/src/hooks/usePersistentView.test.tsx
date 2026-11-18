// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePersistentView } from "./usePersistentView";

const storageKey = "test:spendify:view";

function ViewPreference() {
  const [view, setView] = usePersistentView(storageKey, "table");
  return (
    <>
      <output aria-label="Current layout">{view}</output>
      <button onClick={() => setView("grid")}>Select grid</button>
    </>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(storageKey);
});

describe("usePersistentView", () => {
  it("saves the selected view and restores it after remounting", async () => {
    const user = userEvent.setup();
    const firstRender = render(<ViewPreference />);

    expect(screen.getByLabelText("Current layout").textContent).toBe("table");
    await user.click(screen.getByRole("button", { name: "Select grid" }));
    expect(window.localStorage.getItem(storageKey)).toBe("grid");

    firstRender.unmount();
    render(<ViewPreference />);
    expect(screen.getByLabelText("Current layout").textContent).toBe("grid");
  });

  it("uses the default for an unsupported saved value", () => {
    window.localStorage.setItem(storageKey, "cards");
    render(<ViewPreference />);

    expect(screen.getByLabelText("Current layout").textContent).toBe("table");
  });
});
