import { describe, expect, it } from "vitest";
import { money } from "./format";
describe("UT10 formatting helpers", () => {
  it("formats INR currency", () =>
    expect(money(1250, "INR")).toContain("1,250"));
});
