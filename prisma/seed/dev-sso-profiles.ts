import type { SsoProfile } from "@/lib/schemas/sso-profile";

// Fake SSO profiles for the /dev-sign-in page. The seed creates a matching user for
// each one (same ssoId, employee number and groups) in the BU and team named here.
// businessUnit null means "not in the database yet": signing in tests onboarding.
export type DevSsoProfile = {
  profile: SsoProfile;
  businessUnit: string | null;
  team: string | null; // null = Unassigned
};

const ADMIN_GROUP = ["CALENDAR_ADMIN"];

export const devSsoProfiles: DevSsoProfile[] = [
  {
    // 100001 is in SUPER_ADMIN_EMPLOYEE_NUMBERS in .env.example.
    profile: profile("dev-0001", "100001", "Grace", "Adeyemi", []),
    businessUnit: "West Operations",
    team: "Service Design",
  },
  {
    profile: profile("dev-0002", "200002", "Tom", "Okafor", ADMIN_GROUP),
    businessUnit: "West Operations",
    team: "Finance Operations",
  },
  {
    profile: profile("dev-0003", "200003", "Priya", "Shah", []),
    businessUnit: "West Operations",
    team: "Service Design",
  },
  {
    profile: profile("dev-0004", "200004", "Owen", "Hughes", []),
    businessUnit: "West Operations",
    team: null,
  },
  {
    profile: profile("dev-0005", "200005", "Fatima", "Rahman", ADMIN_GROUP),
    businessUnit: "North Finance",
    team: "Payroll",
  },
  {
    profile: profile("dev-0006", "200006", "Callum", "Reid", ADMIN_GROUP),
    businessUnit: "Corporate Services",
    team: "Legal",
  },
  {
    profile: profile("dev-0007", "200007", "Ana", "Kowalska", []),
    businessUnit: "Corporate Services",
    team: "Communications",
  },
  {
    profile: profile("dev-0008", "200008", "Siobhán", "Ní Bhriain", []),
    businessUnit: null,
    team: null,
  },
];

function profile(
  ssoId: string,
  employeeNumber: string,
  firstName: string,
  surname: string,
  formalGroups: string[],
): SsoProfile {
  const email = `${ssoId}@example.com`;
  return { ssoId, employeeNumber, firstName, surname, email, formalGroups };
}
