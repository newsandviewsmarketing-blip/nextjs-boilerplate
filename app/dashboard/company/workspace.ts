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

export async function getCurrentCompanyWorkspace(requestedCompanyId?: string) {
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

  // Never silently act on the first company when a user belongs to several.
  // Company membership RPC and target RLS remain the source of authority.
  const workspaces = (data ?? []) as CompanyWorkspace[];
  if (workspaces.length === 0) {
    redirect("/dashboard?error=No%20approved%20company%20workspace%20is%20assigned.");
  }
  if (workspaces.length > 1 && !requestedCompanyId) {
    redirect("/dashboard/company/select");
  }
  const workspace = requestedCompanyId
    ? workspaces.find(item => item.company_id === requestedCompanyId)
    : workspaces[0];
  if (!workspace) {
    redirect("/dashboard/company/select?error=Company%20access%20not%20available.");
  }
  return { identity, supabase, workspace, workspaces };
}

export async function requireCompanyPermission(permission: CompanyPermission, companyId?: string) {
  const context = await getCurrentCompanyWorkspace(companyId);

  if (!workspaceHasPermission(context.workspace, permission)) {
    redirect(
      `/dashboard/company?error=${encodeURIComponent(
        "You do not have permission to perform this company action.",
      )}`,
    );
  }

  return context;
}
