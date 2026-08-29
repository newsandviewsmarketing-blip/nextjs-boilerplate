import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CompanyPermission =
  | "company.manage"
  | "members.manage"
  | "members.view"
  | "jobs.manage"
  | "applicants.manage"
  | "products.manage"
  | "company.view_private";

export type CompanyWorkspace = {
  company_id: string;
  legacy_company_user_id: string;
  canonical_name: string;
  company_verification_status: string;
  member_role: string;
  designation: string | null;
  permissions: string[] | null;
};

export function workspaceHasPermission(
  workspace: CompanyWorkspace,
  permission: CompanyPermission,
) {
  const permissions = workspace.permissions ?? [];

  return (
    workspace.member_role === "owner" ||
    permissions.includes("company.manage") ||
    permissions.includes(permission)
  );
}

export async function getCurrentCompanyWorkspace() {
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/login?next=/dashboard/company");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_company_workspaces");

  if (error) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "Unable to load your company workspace.",
      )}`,
    );
  }

  const workspace = ((data ?? [])[0] ?? null) as CompanyWorkspace | null;

  if (!workspace) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "No active approved company workspace is assigned to this account.",
      )}`,
    );
  }

  return { identity, supabase, workspace };
}

export async function requireCompanyPermission(permission: CompanyPermission) {
  const context = await getCurrentCompanyWorkspace();

  if (!workspaceHasPermission(context.workspace, permission)) {
    redirect(
      `/dashboard/company?error=${encodeURIComponent(
        "You do not have permission to perform this company action.",
      )}`,
    );
  }

  return context;
}
