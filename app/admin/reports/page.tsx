import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import PrintReportButton from "./PrintReportButton";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Params={from?:string;to?:string};
const valid=(s?:string)=>s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
type Row={id:string;created_at:string;action:string;entity_type:string;entity_id:string|null;actor_id:string|null};
export default async function AdminReportsPage({searchParams}:{searchParams:Promise<Params>}){
  const p=await searchParams;
  const from=valid(p.from),to=valid(p.to);
  const identity=await requireAdminPermission("audit.view","/admin/reports");
  const supabase=await createClient();
  let query=supabase.from("audit_logs").select("id,created_at,action,entity_type,entity_id,actor_id").order("created_at",{ascending:false}).limit(500);
  if(from)query=query.gte("created_at",from+"T00:00:00Z");
  if(to)query=query.lt("created_at",to+"T23:59:59.999Z");
  const {data,error}=await query;
  const rows=(data??[]) as Row[];
  const qp=new URLSearchParams();if(from)qp.set("from",from);if(to)qp.set("to",to);
  const csv="/admin/reports/export"+(qp.size?"?"+qp.toString():"");
  return <main className="vc-admin-page">
    <SiteHeader/>
    <section className="vc-admin-banner"><div className="shell vc-admin-banner-content"><div><span className="section-kicker">SECURE GOVERNANCE REPORT</span><h1>Administrative activity report</h1><p>For management filing and decision review. Restricted to authorized administrators.</p></div></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout">
      <div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
      <div className="admin-control-content vc-admin-main">
        <div className="vc-admin-panel"><div className="vc-panel-header"><div><h2>Export and print</h2><p>Newest 500 audit records for the selected period. Downloaded CSV contains up to 2,000 records.</p></div></div>
          <form method="get" className="vc-admin-filter-row" action="/admin/reports">
            <div><label htmlFor="report-from">From (UTC)</label><input type="date" id="report-from" name="from" defaultValue={from}/></div>
            <div><label htmlFor="report-to">To (UTC)</label><input type="date" id="report-to" name="to" defaultValue={to}/></div>
            <button className="button button-primary">Apply dates</button><Link href="/admin/reports">Clear</Link>
          </form>
          <div className="vc-report-actions"><Link className="button button-primary" href={csv}>Download CSV</Link><PrintReportButton/><Link href="/admin/audit" className="button button-secondary">Detailed audit log</Link></div>
          <p className="vc-panel-footnote">Report generated {new Date().toLocaleString("en-PK",{timeZone:"Asia/Karachi"})} PKT. Audit events reflect records written by the application, not every read or page view.</p>
          {error?<p role="alert">Audit data could not be loaded. Do not file this report as complete.</p>:<div className="admin-directory-table-wrap"><table className="admin-directory-table">
            <thead><tr><th>Date / time (PKT)</th><th>Action</th><th>Entity type</th><th>Record reference</th><th>Actor reference</th></tr></thead>
            <tbody>{rows.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})}</td>
              <td>{row.action.replaceAll("_"," ").replaceAll("."," · ")}</td><td>{row.entity_type}</td>
              <td><code>{row.entity_id??"System"}</code></td><td><code>{row.actor_id??"System"}</code></td></tr>)}</tbody>
          </table>{rows.length===0&&<p>No recorded actions match these dates.</p>}</div>}
        </div>
      </div>
    </div></section><SiteFooter/>
  </main>;
}
