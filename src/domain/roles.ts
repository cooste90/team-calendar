// Works out a person's role from their SSO profile at every sign-in (spec §1.2).
// There is no in-app way to grant roles: SSO groups and the env allowlist decide.
import type { Role } from "./permissions";

export type RoleSettings = {
  ADMIN_GROUP_NAME: string;
  SUPER_ADMIN_EMPLOYEE_NUMBERS: string[];
};

// Group names must match exactly (case included), as the identity provider sends them.
// Employee numbers are compared after trimming spaces. SUPER_ADMIN wins over ADMIN.
export function computeRole(
  profile: { employeeNumber: string; formalGroups: string[] },
  settings: RoleSettings,
): Role {
  if (settings.SUPER_ADMIN_EMPLOYEE_NUMBERS.includes(profile.employeeNumber.trim())) {
    return "SUPER_ADMIN";
  }
  if (profile.formalGroups.includes(settings.ADMIN_GROUP_NAME)) {
    return "ADMIN";
  }
  return "USER";
}

// The role shown after a person's BU and team, e.g. in the user menu. Regular users
// get no label (T26).
export function roleLabel(role: Role): string | null {
  if (role === "ADMIN") return "Admin";
  if (role === "SUPER_ADMIN") return "Super admin";
  return null;
}
