import Link from "next/link";
import { redirect } from "next/navigation";
import CareerWorkspaceFrame from "@/app/components/CareerWorkspaceFrame";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CompanyWorkspace } from "../workspace";

export const dynamic = "force-dynamic";

/** Choice is presentation only. Every destination and write revalidates RPC membership. */
export default async function SelectCompanyWorkspace({searchParams}:{
  searchParams:Promise<{error?:string}>;
}) {
  const identity=await getCurrentIdentity();
  if(!identity)redirect("/login?next=/dashboard/company/select");
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("get_my_company_workspaces");
  const workspaces=(data??[]) as CompanyWorkspace[];
  const message=(await searchParams).error;
  return <CareerWorkspaceFrame active="company" module="company"
    name={identity.profile?.full_name||identity.email}
    title="Choose your company" description="Your personal account may be connected to more than one employer or business. Select a company before working with its jobs, products or applicants.">
    <section className="vcx-panel">
      {message&&<p role="alert" className="form-message form-message-error">Select a company you have permission to access.</p>}
      {error?<p role="alert">Company workspaces are temporarily unavailable. Please retry.</p>:
       workspaces.length===0?<div className="empty-state"><h2>No approved company membership</h2><Link href="/dashboard">Return to account</Link></div>:
       <div className="workspace-record-list">
       {workspaces.map(company=><article key={company.company_id}>
         <div><h2>{company.canonical_name}</h2><p>{company.designation||company.member_role} · {company.company_verification_status}</p></div>
         <Link className="button button-primary" href={`/dashboard/company?company=${encodeURIComponent(company.company_id)}`}>Open company</Link>
       </article>)}
       </div>}
    </section>
  </CareerWorkspaceFrame>;
}
