import { expect, it } from "vitest";
import { computeRole } from "../roles";

const settings = { ADMIN_GROUP_NAME: "CALENDAR_ADMIN", SUPER_ADMIN_EMPLOYEE_NUMBERS: ["100001"] };

it.each([
  {
    rule: "no group and not on the allowlist is a USER",
    employeeNumber: "200002",
    formalGroups: [],
    role: "USER",
  },
  {
    rule: "the admin group makes an ADMIN",
    employeeNumber: "200002",
    formalGroups: ["STAFF", "CALENDAR_ADMIN"],
    role: "ADMIN",
  },
  {
    rule: "the allowlist makes a SUPER_ADMIN",
    employeeNumber: "100001",
    formalGroups: [],
    role: "SUPER_ADMIN",
  },
  {
    rule: "being in both makes a SUPER_ADMIN",
    employeeNumber: "100001",
    formalGroups: ["CALENDAR_ADMIN"],
    role: "SUPER_ADMIN",
  },
  {
    rule: "the group name must match exactly, case included",
    employeeNumber: "200002",
    formalGroups: ["calendar_admin"],
    role: "USER",
  },
  {
    rule: "spaces around the employee number are ignored",
    employeeNumber: " 100001 ",
    formalGroups: [],
    role: "SUPER_ADMIN",
  },
])("$rule", ({ employeeNumber, formalGroups, role }) => {
  expect(computeRole({ employeeNumber, formalGroups }, settings)).toBe(role);
});
