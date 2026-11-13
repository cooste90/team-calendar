import { describe, expect, it } from "vitest";
import { displayFirstName, displayName } from "../display-name";

describe("displayName", () => {
  it("uses the preferred first name when one is set", () => {
    const tom = { firstName: "Thomas", preferredName: "Tom", surname: "Okafor" };
    expect(displayFirstName(tom)).toBe("Tom");
    expect(displayName(tom)).toBe("Tom Okafor");
  });

  it("falls back to the SSO first name when no preferred name is set", () => {
    expect(displayName({ firstName: "Thomas", preferredName: null, surname: "Okafor" })).toBe(
      "Thomas Okafor",
    );
    expect(displayName({ firstName: "Thomas", preferredName: "", surname: "Okafor" })).toBe(
      "Thomas Okafor",
    );
  });
});
