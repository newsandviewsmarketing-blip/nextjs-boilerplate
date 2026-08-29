import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity, type AccountRole, type CurrentIdentity } from "@/lib/auth";

export type AdminPermission =
  | "admin.view"
  | "profiles.review"
  | "regulatory.review"
  | "products.manage"
  | "products.delete"
  | "jobs.manage"
  | "users.manage"
  | "audit.view"
  | "analytics.view"
  | "review.analytics"
  | "profiles.create"
  | "companies.create"
  | "clinics.manage"
  | "laboratories.manage"
  | "products.create"
  | "jobs.create"
  | "master_data.manage"
  | "directories.manage";

export const permissionOptions: ReadonlyArray<{ value: AdminPermission; label: string; summary: string }> = [
  { value: "profiles.create", label: "Create profiles", summary: "Create staff-assisted veterinarian/professional directory records." },
  { value: "profiles.review", label: "Review profiles", summary: "Approve or reject professional profile submissions." },
  { value: "regulatory.review", label: "Review credentials", summary: "Review PVMC and regulatory evidence." },
  { value: "companies.create", label: "Create companies", summary: "Create canonical company directory records without a client login." },
  { value: "clinics.manage", label: "Manage clinics", summary: "Create/edit clinics and review appointment requests." },
  { value: "laboratories.manage", label: "Manage laboratories", summary: "Create/edit laboratories and review test information requests." },
  { value: "products.create", label: "Create products", summary: "Enter products on behalf of approved companies." },
  { value: "products.manage", label: "Manage products", summary: "Moderate and edit product records." },
  { value: "products.delete", label: "Delete products", summary: "Permanently remove product records where permitted." },
  { value: "jobs.create", label: "Create jobs", summary: "Enter vacancies on behalf of employers." },
  { value: "jobs.manage", label: "Manage jobs", summary: "Moderate jobs and recruitment records." },
  { value: "master_data.manage", label: "Manage master data", summary: "Add cities, sectors, packaging, vaccine types and other controlled lists." },
  { value: "directories.manage", label: "Manage directories", summary: "Maintain public directory records and assisted-entry records." },
  { value: "users.manage", label: "Manage users & roles", summary: "Activate/suspend accounts and assign staff roles/permissions." },
  { value: "audit.view", label: "View audit log", summary: "Review administrative activity." },
  { value: "review.analytics", label: "Review analytics", summary: "See reviewer performance and decision history." },
  { value: "analytics.view", label: "View analytics", summary: "Read operational metrics." },
] as const;

const rolePermissions: Partial<Record<AccountRole, readonly AdminPermission[]>> = {
  super_admin: ["admin.view","profiles.review","regulatory.review","products.manage","products.delete","jobs.manage","users.manage","audit.view","analytics.view","review.analytics","profiles.create","companies.create","clinics.manage","laboratories.manage","products.create","jobs.create","master_data.manage","directories.manage"],
  verification_officer: ["admin.view","profiles.review","regulatory.review","review.analytics","profiles.create","clinics.manage","laboratories.manage","directories.manage"],
  content_admin: ["admin.view","products.manage","jobs.manage","products.create","jobs.create","companies.create","directories.manage"],
  career_admin: ["admin.view","jobs.manage","jobs.create"],
  analyst: ["admin.view", "audit.view", "analytics.view"],
};

export const staffRoleOptions = [
  { value: "super_admin", label: "Super Administrator", level: 100, summary: "Full platform, user, role, publishing, master-data and audit control." },
  { value: "verification_officer", label: "Verification Officer", level: 70, summary: "Profiles, professional credentials, clinics/labs and verification workflows." },
  { value: "content_admin", label: "Marketplace & Content Admin", level: 60, summary: "Companies, products, marketplace publishing and job moderation." },
  { value: "career_admin", label: "Careers Admin", level: 50, summary: "Jobs, applications and recruitment workflows." },
  { value: "analyst", label: "Read-only Analyst", level: 20, summary: "Operational metrics and audit visibility without write access." },
] as const satisfies ReadonlyArray<{ value: AccountRole; label: string; level: number; summary: string }>;

export function hasAdminPermissionForRoles(roles: readonly AccountRole[], permission: AdminPermission) {
  return roles.some((role) => rolePermissions[role]?.includes(permission));
}

export function hasAdminPermission(identity: CurrentIdentity, permission: AdminPermission) {
  return hasAdminPermissionForRoles(identity.roles, permission);
}

export async function getEffectiveAdminPermission(identity: CurrentIdentity, permission: AdminPermission) {
  const roleAllowed = hasAdminPermission(identity, permission);
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_user_permissions")
    .select("granted_permissions, revoked_permissions")
    .eq("user_id", identity.userId)
    .maybeSingle();
  const granted = (data?.granted_permissions ?? []) as string[];
  const revoked = (data?.revoked_permissions ?? []) as string[];
  if (revoked.includes(permission)) return false;
  if (granted.includes(permission)) return true;
  return roleAllowed;
}

export async function requireAdminPermission(permission: AdminPermission, returnTo: string) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!(await getEffectiveAdminPermission(identity, permission))) {
    redirect("/dashboard?error=You%20do%20not%20have%20permission%20for%20that%20admin%20area.");
  }
  return identity;
}

export function staffRoleLabel(role: string) {
  return staffRoleOptions.find((item) => item.value === role)?.label ?? role.replaceAll("_", " ");
}
