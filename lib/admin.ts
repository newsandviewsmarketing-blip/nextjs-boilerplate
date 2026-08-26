import "server-only";

import { redirect } from "next/navigation";
import {
  getCurrentIdentity,
  type AccountRole,
  type CurrentIdentity,
} from "@/lib/auth";

export type AdminPermission =
  | "admin.view"
  | "profiles.review"
  | "regulatory.review"
  | "products.manage"
  | "products.delete"
  | "jobs.manage"
  | "users.manage"
  | "audit.view"
  | "analytics.view";

const rolePermissions: Partial<Record<AccountRole, readonly AdminPermission[]>> = {
  super_admin: [
    "admin.view",
    "profiles.review",
    "regulatory.review",
    "products.manage",
    "products.delete",
    "jobs.manage",
    "users.manage",
    "audit.view",
    "analytics.view",
  ],
  verification_officer: [
    "admin.view",
    "profiles.review",
    "regulatory.review",
  ],
  content_admin: ["admin.view", "products.manage", "jobs.manage"],
  career_admin: ["admin.view", "jobs.manage"],
  analyst: ["admin.view", "audit.view", "analytics.view"],
};

export const staffRoleOptions = [
  {
    value: "super_admin",
    label: "Super Administrator",
    level: 100,
    summary: "Full platform, user, role, publishing and audit control.",
  },
  {
    value: "verification_officer",
    label: "Verification Officer",
    level: 70,
    summary: "Profiles, professional credentials and regulatory evidence.",
  },
  {
    value: "content_admin",
    label: "Marketplace & Content Admin",
    level: 60,
    summary: "Products, marketplace publishing and job moderation.",
  },
  {
    value: "career_admin",
    label: "Careers Admin",
    level: 50,
    summary: "Jobs, applications and recruitment workflows.",
  },
  {
    value: "analyst",
    label: "Read-only Analyst",
    level: 20,
    summary: "Operational metrics and audit visibility without write access.",
  },
] as const satisfies ReadonlyArray<{
  value: AccountRole;
  label: string;
  level: number;
  summary: string;
}>;

export function hasAdminPermissionForRoles(
  roles: readonly AccountRole[],
  permission: AdminPermission,
) {
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}

export function hasAdminPermission(
  identity: CurrentIdentity,
  permission: AdminPermission,
) {
  return hasAdminPermissionForRoles(identity.roles, permission);
}

export async function requireAdminPermission(
  permission: AdminPermission,
  returnTo: string,
) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!hasAdminPermission(identity, permission)) {
    redirect("/dashboard?error=You%20do%20not%20have%20permission%20for%20that%20admin%20area.");
  }
  return identity;
}

export function staffRoleLabel(role: string) {
  return staffRoleOptions.find((item) => item.value === role)?.label ?? role.replaceAll("_", " ");
}
