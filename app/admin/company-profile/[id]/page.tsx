import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import AdminNav from "../../components/AdminNav";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import CompanyProfileFields from "../../../components/CompanyProfileFields";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ManagementContact } from "@/lib/company-profile-editor";
import { saveBoundAdminCompanyProfileAction } from "../actions";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminCompanyProfilePage({
  params,searchParams,
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{error?:string;message?:string}>;
}) {
  const {id}=await params;
  if(!uuid.test(id)) notFound();
  const feedback=await searchParams;
  const identity=await requireAdminPermission("directories.manage","/admin/company-profile/"+id);
  if(!identity.roles.includes("super_admin")) redirect("/admin/directory?error=Super%20administrator%20access%20required.");
  const supabase=await createClient();
  const [company,presentation,contacts]=await Promise.all([
    supabase.from("companies").select("*").eq("id",id).maybeSingle(),
    supabase.from("company_profile_content").select("*").eq("company_id",id).maybeSingle(),
    supabase.from("company_private_contacts").select("full_name,designation,department,office_phone,mobile_phone,email,reports_to,notes").eq("company_id",id).order("sort_order"),
  ]);
  if(company.error) {
    console.error("Company editor query failed", { code: company.error.code, message: company.error.message });
    return <main><SiteHeader/><section className="section"><div className="shell">
      <h1>Company profile temporarily unavailable</h1>
      <p role="alert">The company record could not be loaded. No changes were made. Please retry or contact the administrator.</p>
      <Link href={"/admin/company-profile/"+id} className="button button-primary">Retry loading</Link>
      <Link href={"/admin/directory/company/"+id} className="button button-secondary">Return to company record</Link>
    </div></section><SiteFooter/></main>;
  }
  if(!company.data) notFound();
  const published=company.data.is_published&&company.data.verification_status==="approved";
  return <main><SiteHeader/>
    <section className="dashboard-hero"><div className="shell">
      <span className="section-kicker">ADMIN COMPANY PROFILE STUDIO</span>
      <h1>{company.data.canonical_name}</h1>
      <p>Authorized administrative editing of the same complete company profile available in the company dashboard. Internal management contacts stay private.</p>
    </div></section>
    <section className="section compact-section"><div className="shell admin-control-layout">
      <AdminNav roles={identity.roles}/>
      <div className="admin-control-content">
        <FormMessage {...feedback}/>
        <div className="management-links">
          <Link href={"/admin/directory/company/"+id} className="button button-secondary">Company dossier</Link>
          <Link href={"/admin/company-profile/"+id+"/export"} className="button button-secondary">Internal PDF / print profile</Link>
          {published&&<Link href={"/companies/"+id} className="button button-secondary">Public company page</Link>}
        </div>
        {(presentation.error||contacts.error)?<div className="setup-notice" role="alert"><b>Company details could not be loaded.</b> Editing is disabled to protect existing information. <Link href={"/admin/company-profile/"+id}>Retry loading</Link>.</div>:
        <form className="profile-form" action={saveBoundAdminCompanyProfileAction.bind(null,id,false)}>
          <input type="hidden" name="company_id" value={id}/>
          <CompanyProfileFields mode="admin-edit"
            initial={company.data}
            presentation={presentation.data}
            contacts={(contacts.data??[]) as ManagementContact[]}/>
          {published&&<div className="form-span-2">
            <label htmlFor="acknowledge_live_edit">This public company is approved. Type ACKNOWLEDGE to confirm public-facing changes.</label>
            <input id="acknowledge_live_edit" name="acknowledge_live_edit" autoComplete="off" placeholder="ACKNOWLEDGE" required/>
          </div>}
          <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Saving company...">Save Complete Company Profile</FormSubmitButton>
        </form>}
      </div>
    </div></section><SiteFooter/>
  </main>;
}
