import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import {requireAdminPermission,getEffectiveAdminPermissions} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Params={q?:string;status?:string};
type AppRow={id:string;job_id:string;candidate_user_id:string;status:string;applied_at:string};
export default async function AdminApplicationsPage({searchParams}:{searchParams:Promise<Params>}){
  const params=await searchParams;
  const identity=await requireAdminPermission("jobs.manage","/admin/applications");
  const permissions=await getEffectiveAdminPermissions(identity);
  const supabase=await createClient();
  const {data,error}=await supabase.from("job_applications").select("id,job_id,candidate_user_id,status,applied_at").order("applied_at",{ascending:false}).limit(200);
  const applications=(data??[]) as AppRow[];
  const jobIds=[...new Set(applications.map(r=>r.job_id))];
  const {data:jobRows}=jobIds.length?await supabase.from("jobs").select("id,title").in("id",jobIds):{data:[]};
  const names=new Map((jobRows??[]).map(r=>[r.id,r.title]));
  const term=(params.q??"").trim().toLowerCase();
  const visible=applications.filter(item=>(!term || (names.get(item.job_id)||"").toLowerCase().includes(term) || item.id.toLowerCase().includes(term)) && (!params.status || params.status==="all" || item.status===params.status));
  return <main className="vc-admin-page"><SiteHeader/>
    <section className="vc-admin-banner"><div className="shell"><span className="section-kicker">RECRUITMENT OPERATIONS</span><h1>Job applications</h1><p>Recent applications and employer recruitment references, subject to authorized access.</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
      <div className="admin-control-content vc-admin-main"><section className="vc-admin-panel">
        <div className="vc-panel-header"><div><h2>Applications register</h2><p>Latest 200 accessible applications. Applicant CV access remains restricted to the correct employer or another explicitly authorized role.</p></div></div>
        <form method="get" className="vc-admin-filter-row"><div><label htmlFor="app-search">Search job or reference</label><input id="app-search" name="q" defaultValue={params.q??""}/></div>
          <div><label htmlFor="app-status">Status</label><select id="app-status" name="status" defaultValue={params.status??"all"}><option value="all">All statuses</option><option value="applied">Applied</option><option value="reviewing">Reviewing</option><option value="shortlisted">Shortlisted</option><option value="rejected">Rejected</option></select></div><button className="button button-primary">Filter</button><Link href="/admin/applications">Clear</Link>
        </form>
        {error?<p role="alert">Applications could not be loaded.</p>:<div className="admin-directory-table-wrap"><table className="admin-directory-table"><thead><tr><th>Applied</th><th>Job</th><th>Application ID</th><th>Status</th><th>Record</th></tr></thead>
          <tbody>{visible.map(item=><tr key={item.id}><td>{new Date(item.applied_at).toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})}</td><td>{names.get(item.job_id)||"Job record"}</td><td><code>{item.id.slice(0,12)}</code></td><td>{item.status}</td>
            <td>{permissions.has("directories.manage")?<Link href={"/admin/directory/job/"+item.job_id}>Job dossier</Link>:<Link href="/admin/reviews#jobs-review">Review queue</Link>}</td></tr>)}</tbody></table>{visible.length===0&&<p>No matching applications.</p>}</div>}
      </section></div>
    </div></section><SiteFooter/>
  </main>;
}
