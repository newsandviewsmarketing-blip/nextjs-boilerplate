import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const selfRegistrationRoles = [
  "veterinarian",
  "company",
  "candidate",
  "user",
] as const;

export type SelfRegistrationRole = (typeof selfRegistrationRoles)[number];
export type AccountRole = SelfRegistrationRole | "career_admin" | "super_admin";

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
  return role === "super_admin" || role === "career_admin";
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
