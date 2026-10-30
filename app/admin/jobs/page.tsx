import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Params={search?:string;status?:string};
type Row={id:string;title:string;sector:string|null;verification_status:string;is_published:boolean;created_at:string};
export default async function AdminJobsPage({searchParams}:{searchParams:Promise<Params>}){
 const p=await searchParams;
 const identity=await requireAdminPermission("jobs.manage","/admin/jobs");
 const supabase=await createClient();
 const {data,error}=await supabase.from("jobs").select("id,title,sector,verification_status,is_published,created_at").order("created_at",{ascending:false}).limit(200);
 const term=(p.search??"").trim().toLowerCase();
 const rows=((data??[]) as Row[]).filter(row=>(!term || (row.title+" "+(row.sector??"")).toLowerCase().includes(term)) && (!p.status||p.status==="all"||row.verification_status===p.status));
 return <main className="vc-admin-page"><SiteHeader/>
  <section className="vc-admin-banner"><div className="shell"><span className="section-kicker">VETCONNECT HR</span><h1>Job management</h1><p>Vacancy records with direct review and administrative dossier links.</p></div></section>
  <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
    <div className="admin-control-content vc-admin-main"><section className="vc-admin-panel">
      <div className="vc-panel-header"><div><h2>Jobs register</h2><p>Latest 200 accessible vacancies. Approval actions remain in the established review queue.</p></div><Link href="/admin/reviews#jobs-review">Review pending jobs →</Link></div>
      <form className="vc-admin-filter-row" method="get"><div><label htmlFor="job-query">Search title or sector</label><input id="job-query" name="search" defaultValue={p.search??""}/></div>
        <div><label htmlFor="job-status">Status</label><select id="job-status" name="status" defaultValue={p.status??"all"}><option value="all">Any status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div><button className="button button-primary">Filter</button><Link href="/admin/jobs">Clear</Link>
      </form>
      {error?<p role="alert">Jobs could not be loaded. Counts may be incomplete.</p>:<div className="admin-directory-table-wrap"><table className="admin-directory-table">
        <thead><tr><th>Job title</th><th>Sector</th><th>Submitted</th><th>Review status</th><th>Public</th><th>Open</th></tr></thead><tbody>
          {rows.map(row=><tr key={row.id}><td>{row.title}</td><td>{row.sector||"Not specified"}</td><td>{new Date(row.created_at).toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})}</td>
            <td>{row.verification_status}</td><td>{row.is_published?"Published":"Not published"}</td><td><Link href={"/admin/jobs/"+row.id}>Open record</Link></td></tr>)}
        </tbody></table>{rows.length===0&&<p>No matching jobs.</p>}</div>}
    </section></div>
  </div></section><SiteFooter/></main>;
}
