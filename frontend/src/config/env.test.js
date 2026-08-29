import { describe, expect, it } from "vitest";
import { IS_DEV } from "./env";

describe("IS_DEV", () => {
  it("is a boolean reflecting import.meta.env.DEV (true under the vitest test runner)", () => {
    expect(typeof IS_DEV).toBe("boolean");
    expect(IS_DEV).toBe(true);
  });
});
