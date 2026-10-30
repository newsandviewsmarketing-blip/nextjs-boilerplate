import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {credentialDataFlags} from "@/lib/veterinary-verification";

export const dynamic="force-dynamic";
type Row={user_id:string;pvmc_number:string|null;qualifications:string|null;verification_status:string;pvmc_verification_status:string};
export default async function CredentialRecheckPage(){
 const identity=await requireAdminPermission("regulatory.review","/admin/credential-recheck");
 const supabase=await createClient();
 const {data,error}=await supabase.from("veterinarian_profiles")
  .select("user_id,pvmc_number,qualifications,verification_status,pvmc_verification_status")
  .eq("pvmc_verification_status","approved").order("user_id").limit(1000);
 const records=((data??[]) as Row[]).map(row=>({...row,issues:credentialDataFlags(row)})).filter(row=>row.issues.length);
 const idList=records.map(row=>row.user_id);
 const names=idList.length ? await supabase.from("profiles").select("id,full_name,account_status").in("id",idList):{data:[],error:null};
 const nameMap=new Map((names.data??[]).map(x=>[x.id,x.full_name]));
 return <main className="vc-admin-page"><SiteHeader/>
 <section className="vc-admin-banner"><div className="shell"><span className="section-kicker">VETCONNECT CREDENTIAL INTEGRITY</span><h1>PVMC verification: follow-up queue</h1>
 <p>These are data inconsistencies requiring verification, not findings of misconduct.</p></div></section>
 <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
  <div className="admin-control-content vc-admin-main"><section className="vc-admin-panel">
    <div className="vc-panel-header"><div><h2>{error?"—":records.length} records needing review</h2>
    <p>Approved PVMC status without a registration number or a documented qualifying veterinary degree. Read-only until an authorized reviewer makes a separate decision.</p></div></div>
    {error||names.error?<p role="alert">Verification records could not be loaded completely. Do not treat this queue as complete.</p>:<>
      {records.length===0&&<p>No currently flagged records among those fetched.</p>}
      <div className="admin-directory-table-wrap"><table className="admin-directory-table"><thead><tr><th>Account</th><th>Profile / PVMC statuses</th><th>Qualification on file</th><th>Reasons for follow-up</th><th>Action</th></tr></thead>
      <tbody>{records.map(row=><tr key={row.user_id}>
        <td>{nameMap.get(row.user_id)||"Vet registration"}</td><td>{row.verification_status} / {row.pvmc_verification_status}</td>
        <td>{row.qualifications||"Not provided"}</td><td>{row.issues.join("; ")}</td>
        <td><Link href={`/admin/users/${row.user_id}#actions`} target="_blank" rel="noopener noreferrer">Open case dossier ↗</Link></td>
      </tr>)}</tbody></table></div>
      <p className="vc-panel-footnote">This list checks up to 1,000 approved account-linked veterinary records. Additional managed-entry veterinarians are reviewed through the separate directory. A PVMC number and DVM text alone do not establish authenticity; staff must verify the regulator record and evidence.</p>
    </>}
   </section></div>
 </div></section><SiteFooter/></main>;
}
