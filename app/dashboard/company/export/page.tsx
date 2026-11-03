import { notFound } from "next/navigation";
import Link from "next/link";
import CompanyPrintBody from "@/app/components/CompanyPrintBody";
import { requireCompanyPermission } from "../workspace";
import type { ManagementContact } from "@/lib/company-profile-editor";
export const dynamic="force-dynamic";

export default async function CompanyPrintPage({
  searchParams,
}:{searchParams:Promise<{company?:string;scope?:string}>}) {
  const params=await searchParams;
  const {supabase,workspace}=await requireCompanyPermission("company.view_private",params.company);
  const [company,presentation,contacts]=await Promise.all([
    supabase.from("companies").select("*").eq("id",workspace.company_id).maybeSingle(),
    supabase.from("company_profile_content").select("*").eq("company_id",workspace.company_id).maybeSingle(),
    supabase.from("company_private_contacts").select("full_name,designation,department,office_phone,mobile_phone,email,reports_to,notes")
      .eq("company_id",workspace.company_id).order("sort_order"),
  ]);
  if(company.error||!company.data||presentation.error||contacts.error)notFound();
  return <div className="shell">
    <nav className="vc-company-print-controls vc-company-export-actions">
      <Link className="button button-secondary" href={"/dashboard/company?company="+encodeURIComponent(workspace.company_id)}>Back to company workspace</Link>
      <Link className="button button-secondary" href={"/dashboard/company/export?company="+encodeURIComponent(workspace.company_id)+"&scope="+(params.scope==="public"?"internal":"public")}>{params.scope==="public"?"Show confidential version":"Show public-only version"}</Link>
    </nav>
    <CompanyPrintBody company={company.data} presentation={presentation.data}
      contacts={(contacts.data??[]) as ManagementContact[]}
      privateRecord={params.scope!=="public"}/>
  </div>;
}
