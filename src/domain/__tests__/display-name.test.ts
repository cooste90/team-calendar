import { describe, expect, it } from "vitest";
import { displayFirstName, displayName, initialsOf } from "../display-name";

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

describe("initialsOf", () => {
  it.each([
    {
      rule: "uses the preferred first name",
      preferredName: "Tom",
      surname: "Okafor",
      initials: "TO",
    },
    {
      rule: "falls back to the SSO first name",
      preferredName: null,
      surname: "Okafor",
      initials: "TO",
    },
    { rule: "is always capitals", preferredName: null, surname: "de Souza", initials: "TD" },
    { rule: "keeps accented letters", preferredName: null, surname: "Ó Briain", initials: "TÓ" },
  ])("$rule", ({ preferredName, surname, initials }) => {
    expect(initialsOf({ firstName: "Thomas", preferredName, surname })).toBe(initials);
  });
});
