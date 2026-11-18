// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeAll, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";
beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView)
    HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);
function Example() {
  const [value, setValue] = useState("");
  return (
    <Select
      label="Transaction type"
      placeholder="Choose a type"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "expense", label: "Expense" },
        { value: "income", label: "Income" },
      ]}
    />
  );
}
it("supports keyboard selection and returns focus to the trigger", async () => {
  const user = userEvent.setup();
  render(<Example />);
  const trigger = screen.getByRole("combobox", { name: "Transaction type" });
  await user.tab();
  expect(document.activeElement).toBe(trigger);
  await user.keyboard("[ArrowDown]");
  expect(await screen.findByRole("listbox")).toBeTruthy();
  await user.keyboard("[End][Enter]");
  await waitFor(() => expect(trigger.textContent).toContain("Income"));
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await user.keyboard("[ArrowDown][Escape]");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(trigger.textContent).toContain("Income");
});
