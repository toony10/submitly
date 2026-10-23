import { describe, expect, it } from "vitest";

import {
  defaultMapError,
  defaultNormalize,
  getDotPath,
  isActionResult,
  issuesToErrors,
} from "../src/core";

describe("defaultNormalize", () => {
  it("passes ActionResult-shaped values through", () => {
    const result = { success: false, message: "nope", errors: ["a"] };
    expect(defaultNormalize(result)).toBe(result);
  });

  it("wraps other values as successful data", () => {
    expect(defaultNormalize({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
    expect(defaultNormalize(undefined)).toEqual({ success: true });
    expect(defaultNormalize(null)).toEqual({ success: true, data: null });
  });
});

describe("defaultMapError", () => {
  it("uses the error message for notify and the errors panel", () => {
    expect(defaultMapError(new Error("Failed to fetch"))).toEqual({
      success: false,
      message: "Failed to fetch",
      errors: ["Failed to fetch"],
    });
    expect(defaultMapError("boom")).toEqual({ success: false, message: "boom", errors: ["boom"] });
  });

  it("returns a bare failure for unknown throwables", () => {
    expect(defaultMapError({ status: 500 })).toEqual({ success: false });
    expect(defaultMapError(new Error(""))).toEqual({ success: false });
  });
});

describe("isActionResult", () => {
  it("requires a boolean success flag", () => {
    expect(isActionResult({ success: true })).toBe(true);
    expect(isActionResult({ success: "yes" })).toBe(false);
    expect(isActionResult(null)).toBe(false);
  });
});

describe("issue mapping", () => {
  it("builds dotted paths from keys and path segments", () => {
    expect(getDotPath({ message: "x", path: ["items", 0, { key: "name" }] })).toBe("items.0.name");
    expect(getDotPath({ message: "x" })).toBeUndefined();
    expect(getDotPath({ message: "x", path: [Symbol("s")] })).toBeUndefined();
  });

  it("splits field and form-level issues", () => {
    expect(
      issuesToErrors([
        { message: "Required", path: ["name"] },
        { message: "Too short", path: ["name"] },
        { message: "Passwords differ" },
        { message: "Bad", path: ["items", 1, "qty"] },
      ]),
    ).toEqual({
      fieldErrors: { name: ["Required", "Too short"], "items.1.qty": ["Bad"] },
      errors: ["Passwords differ"],
    });
  });
});
