import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Member={clinic_id:string;professional_user_id:string;membership_status:string;created_at:string};
export default async function AdminClinicAffiliations(){
 const identity=await requireAdminPermission("users.manage","/admin/clinic-affiliations");
 const supabase=await createClient();
 const {data,error}=await supabase.from("clinic_members").select("clinic_id,professional_user_id,membership_status,created_at")
   .eq("membership_status","pending").order("created_at",{ascending:false}).limit(200);
 const records=(data??[]) as Member[];
 const ids=[...new Set(records.map(row=>row.clinic_id))];
 const {data:clinics}=ids.length?await supabase.from("clinics").select("id,clinic_name").in("id",ids):{data:[]};
 const names=new Map((clinics??[]).map(row=>[row.id,row.clinic_name]));
 return <main className="vc-admin-page"><SiteHeader/><section className="vc-admin-banner"><div className="shell"><span className="section-kicker">FACILITY ADMINISTRATION</span><h1>Clinic affiliations</h1><p>Pending requests for professional association with registered clinics.</p></div></section>
  <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
   <div className="admin-control-content vc-admin-main"><section className="vc-admin-panel">
    <div className="vc-panel-header"><div><h2>Pending affiliation requests</h2><p>Read-only review of the newest 200 requests. Membership decisions must use the authorized clinic workflow.</p></div></div>
    {error?<p role="alert">Affiliation requests are unavailable.</p>:<div className="admin-directory-table-wrap"><table className="admin-directory-table">
      <thead><tr><th>Clinic</th><th>Requested</th><th>Professional reference</th><th>Status</th><th>Clinic dossier</th></tr></thead>
      <tbody>{records.map(row=><tr key={row.clinic_id+"-"+row.professional_user_id}><td>{names.get(row.clinic_id)||"Clinic record"}</td>
        <td>{new Date(row.created_at).toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})}</td><td><code>{row.professional_user_id.slice(0,12)}</code></td>
        <td>{row.membership_status}</td><td><Link href={"/admin/directory/clinic/"+row.clinic_id}>Open clinic</Link></td></tr>)}</tbody>
    </table>{records.length===0&&<p>No pending clinic affiliation requests.</p>}</div>}
   </section></div></div></section><SiteFooter/></main>;
}
