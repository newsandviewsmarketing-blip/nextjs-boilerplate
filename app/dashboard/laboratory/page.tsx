import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateLaboratoryRequestStatusAction } from "./actions";
export const dynamic="force-dynamic";
type LaboratoryRequestRow = {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  organization: string | null;
  test_requested: string | null;
  sample_type: string | null;
  message: string;
  status: string;
  created_at: string;
};

export default async function LaboratoryWorkspace({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){const messages=await searchParams;const identity=await getCurrentIdentity();if(!identity)redirect("/login?next=/dashboard/laboratory");const supabase=await createClient();const {data:labs}=await supabase.from("laboratories").select("id,slug,laboratory_name,laboratory_type,verification_status,is_published,tests_offered,species_served").eq("owner_id",identity.userId).order("created_at");const lab=labs?.[0]??null;let requests: LaboratoryRequestRow[]=[];if(lab){const {data}=await supabase.from("laboratory_information_requests").select("id,contact_name,contact_email,contact_phone,organization,test_requested,sample_type,message,status,created_at").eq("laboratory_id",lab.id).order("created_at",{ascending:false}).limit(100);requests=(data??[]) as LaboratoryRequestRow[]}return <main><SiteHeader/><section className="dashboard-hero"><div className="shell dashboard-hero-row"><div><span className="section-kicker">LABORATORY WORKSPACE</span><h1>{lab?.laboratory_name||"Laboratory operations"}</h1><p>Public test information, incoming enquiries and laboratory directory status.</p></div><div className="dashboard-actions"><Link className="button button-secondary" href="/dashboard">My account</Link>{lab?.is_published&&<Link className="button button-primary" href={`/labs/${lab.slug}`}>Public profile</Link>}</div></div></section><section className="section compact-section"><div className="shell"><FormMessage {...messages}/>{!lab?<div className="empty-state"><h2>No owned laboratory profile found.</h2><p>Complete the Laboratory profile on My VetConnect or ask an administrator to create/link the facility.</p><Link href="/dashboard">Back to profile</Link></div>:<><div className="admin-summary"><article><b>{lab.verification_status}</b><span>Profile review</span></article><article><b>{lab.is_published?"Live":"Hidden"}</b><span>Public directory</span></article><article><b>{lab.tests_offered?.length??0}</b><span>Tests offered</span></article><article><b>{requests.filter(r=>r.status==="new").length}</b><span>New enquiries</span></article></div><div className="section-heading"><span className="section-kicker">INCOMING REQUESTS</span><h2>Test-information enquiries.</h2><p>Change status as your laboratory responds. Contact information is shown only inside the owner workspace.</p></div><div className="workspace-record-list">{requests.length===0?<p>No test-information requests yet.</p>:requests.map(r=><article key={r.id}><div><h3>{r.contact_name}</h3><p>{r.organization||"No organization"} · {r.test_requested||"General enquiry"}</p><p>{r.message}</p><p>{r.contact_email||""} {r.contact_phone||""}</p>{r.sample_type&&<p>Sample: {r.sample_type}</p>}<span className={`status-pill status-${r.status}`}>{r.status}</span></div><form action={updateLaboratoryRequestStatusAction}><input type="hidden" name="request_id" value={r.id}/><input type="hidden" name="laboratory_id" value={lab.id}/><select name="status" defaultValue={r.status}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="responded">Responded</option><option value="closed">Closed</option></select><button className="button button-secondary" type="submit">Update</button></form></article>)}</div></>}</div></section><SiteFooter/></main>}
