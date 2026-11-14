import type { SsoProfile } from "../../src/lib/schemas/sso-profile";

// Fake SSO profiles for the /dev-sign-in page. businessUnit and team are the names
// the seed (T13) creates; a new user signing in joins that BU. T13 adds more.
export type DevSsoProfile = { profile: SsoProfile; businessUnit: string; team: string | null };

export const devSsoProfiles: DevSsoProfile[] = [
  {
    profile: {
      ssoId: "dev-0001",
      employeeNumber: "100001", // on SUPER_ADMIN_EMPLOYEE_NUMBERS in .env.example
      firstName: "Grace",
      surname: "Adeyemi",
      email: "grace.adeyemi@example.com",
      formalGroups: [],
    },
    businessUnit: "Finance",
    team: null,
  },
  {
    profile: {
      ssoId: "dev-0002",
      employeeNumber: "200002",
      firstName: "Tom",
      surname: "Okafor",
      email: "tom.okafor@example.com",
      formalGroups: ["CALENDAR_ADMIN"],
    },
    businessUnit: "Finance",
    team: "Payroll",
  },
  {
    profile: {
      ssoId: "dev-0003",
      employeeNumber: "200003",
      firstName: "Priya",
      surname: "Shah",
      email: "priya.shah@example.com",
      formalGroups: [],
    },
    businessUnit: "Finance",
    team: "Payroll",
  },
  {
    profile: {
      ssoId: "dev-0004",
      employeeNumber: "300004",
      firstName: "Ana",
      surname: "Kowalska",
      email: "ana.kowalska@example.com",
      formalGroups: [],
    },
    businessUnit: "Operations",
    team: "Logistics",
  },
];
