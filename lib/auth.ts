import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const selfRegistrationRoles = [
  "veterinarian",
  "company",
  "candidate",
  "professional",
  "laboratory",
  "user",
] as const;

export type SelfRegistrationRole = (typeof selfRegistrationRoles)[number];
export type AccountRole =
  | SelfRegistrationRole
  | "career_admin"
  | "verification_officer"
  | "content_admin"
  | "analyst"
  | "super_admin";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface CurrentIdentity {
  userId: string;
  email: string;
  profile: {
    full_name: string;
    phone: string | null;
    city: string | null;
    primary_role: AccountRole;
    account_status: string;
  } | null;
  roles: AccountRole[];
}

export function isAdminRole(role: string) {
  return [
    "super_admin",
    "career_admin",
    "verification_officer",
    "content_admin",
    "analyst",
  ].includes(role);
}

export function canReviewProfiles(role: string) {
  return ["super_admin", "verification_officer"].includes(role);
}

export function canModerateProducts(role: string) {
  return ["super_admin", "content_admin"].includes(role);
}

export function canManageJobs(role: string) {
  return ["super_admin", "career_admin", "content_admin"].includes(role);
}

export function canManageUsers(role: string) {
  return role === "super_admin";
}

export function canViewAudit(role: string) {
  return ["super_admin", "analyst"].includes(role);
}

export function isAllowedSelfRegistrationRole(
  role: string,
): role is SelfRegistrationRole {
  return selfRegistrationRoles.includes(role as SelfRegistrationRole);
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (error || !userId) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, city, primary_role, account_status")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const email = typeof claims?.email === "string" ? claims.email : "";
  return {
    userId,
    email,
    profile: profile as CurrentIdentity["profile"],
    roles: (roleRows ?? []).map((row) => row.role as AccountRole),
  };
}
