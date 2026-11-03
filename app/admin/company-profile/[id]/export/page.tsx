import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import CompanyPrintBody from "@/app/components/CompanyPrintBody";
import type {ManagementContact} from "@/lib/company-profile-editor";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminCompanyPrintPage({
  params,searchParams,
}:{params:Promise<{id:string}>;searchParams:Promise<{scope?:string}>}) {
  const {id}=await params;
  if(!uuid.test(id))notFound();
  const identity=await requireAdminPermission("directories.manage","/admin/company-profile/"+id);
  if(!identity.roles.includes("super_admin"))redirect("/admin/directory");
  const query=await searchParams;
  const supabase=await createClient();
  const [company,presentation,contacts]=await Promise.all([
    supabase.from("companies").select("*").eq("id",id).maybeSingle(),
    supabase.from("company_profile_content").select("*").eq("company_id",id).maybeSingle(),
    supabase.from("company_private_contacts").select("full_name,designation,department,office_phone,mobile_phone,email,reports_to,notes")
      .eq("company_id",id).order("sort_order"),
  ]);
  if(company.error||!company.data||presentation.error||contacts.error)notFound();
  return <div className="shell">
    <nav className="vc-company-print-controls vc-company-export-actions">
      <Link className="button button-secondary" href={"/admin/company-profile/"+id}>Back to admin company editor</Link>
      <Link className="button button-secondary" href={"/admin/company-profile/"+id+"/export?scope="+(query.scope==="public"?"internal":"public")}>{query.scope==="public"?"Show confidential version":"Show public-only version"}</Link>
    </nav>
    <CompanyPrintBody company={company.data} presentation={presentation.data}
      contacts={(contacts.data??[]) as ManagementContact[]}
      privateRecord={query.scope!=="public"}/>
  </div>;
}
