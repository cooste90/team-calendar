import { describe, expect, test } from "vitest";
import { safeCallbackUrl, signInPageUrl } from "./callback-url";

describe("after signing in, only a page on this site is allowed", () => {
  test.each([
    { value: "/", expected: "/" },
    { value: "/?profile=me", expected: "/?profile=me" },
    { value: "/?bu=north-finance&view=month", expected: "/?bu=north-finance&view=month" },
    { value: "https://example.com", expected: "/" },
    { value: "//example.com", expected: "/" },
    { value: "/\\example.com", expected: "/" },
    { value: "sign-in", expected: "/" },
    { value: "", expected: "/" },
    { value: null, expected: "/" },
    { value: undefined, expected: "/" },
  ])("$value → $expected", ({ value, expected }) => {
    expect(safeCallbackUrl(value)).toBe(expected);
  });
});

describe("the sign-in link remembers where to come back to", () => {
  test.each([
    { page: "/sign-in", callbackUrl: "/", expected: "/sign-in" },
    {
      page: "/sign-in",
      callbackUrl: "/?profile=me",
      expected: "/sign-in?callbackURL=%2F%3Fprofile%3Dme",
    },
    {
      page: "/dev-sign-in",
      callbackUrl: "/?view=month",
      expected: "/dev-sign-in?callbackURL=%2F%3Fview%3Dmonth",
    },
  ] as const)("$page, $callbackUrl → $expected", ({ page, callbackUrl, expected }) => {
    expect(signInPageUrl(page, callbackUrl)).toBe(expected);
  });
});
