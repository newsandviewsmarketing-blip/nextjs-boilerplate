import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function RegistrationStatusPage() {
  const supabase=await createClient();
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user) redirect("/login?next=/register/status");
  const [{data:gate,error},{data:profile}] = await Promise.all([
    supabase.from("registration_completion_gate").select("completed_at,review_status,review_note,submitted_at,registration_intent").eq("user_id",auth.user.id).maybeSingle(),
    supabase.from("profiles").select("primary_role").eq("id",auth.user.id).maybeSingle()
  ]);
  const isCompany=profile?.primary_role==="company";
  const target=isCompany ? gate?.registration_intent==="clinic" ? "/dashboard/clinics" : "/dashboard/company" : "/dashboard";
  if(error||!gate) redirect("/register/complete");
  if(!gate.completed_at) redirect("/register/complete");
  if(gate.review_status==="approved") redirect(target);
  const rejected=gate.review_status==="rejected";
  return <main><SiteHeader/><section className="auth-section"><div className="shell"><div className="backend-form-card vc-register-specific">
    <div className="section-heading"><span className="section-kicker">REGISTRATION STATUS</span><h1>{rejected?"Action needed on your application":isCompany?"Your company registration is under review":"Your application is under review"}</h1>
      <p>{rejected?"An administrator returned your application with a note. Update the requested information and resubmit.":isCompany?"Your company details and supporting documents are saved privately. The company management workspace will unlock only after approval and membership activation. You do not need to register the same company again.":"Your documents were submitted privately. They will not appear publicly until an administrator approves the registration."}</p>
    </div>
    {rejected&&gate.review_note&&<div className="form-message form-message-error"><strong>Administrator note</strong><p>{gate.review_note}</p></div>}
    {gate.submitted_at&&<p className="form-help">Last submitted {new Date(gate.submitted_at).toLocaleString()}.</p>}
    {rejected?<a className="button button-primary button-full" href="/register/complete">Update documents and resubmit</a>:<p className="form-help">We will email you when the review is complete. You can safely sign out and return later with this email account.</p>}
    {!isCompany&&<p><a className="button button-primary" href="/career">Prepare your CV and job preferences while you wait</a></p>}
    <p className="center-note"><a href="/login">Return to sign in</a></p>
  </div></div></section><SiteFooter/></main>;
}
