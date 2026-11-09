import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn utility", () => {
  it("merges classes cleanly", () => {
    expect(cn("px-4", "py-2", "px-6")).toBe("py-2 px-6");
  });

  it("handles conditionals properly", () => {
    const active = true;
    const disabled = false;
    expect(cn("base", active && "active", disabled && "disabled")).toBe("base active");
  });
});
