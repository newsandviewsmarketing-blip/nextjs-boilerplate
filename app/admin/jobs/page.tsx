import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import {requireAdminPermission,getEffectiveAdminPermissions} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";

export const dynamic="force-dynamic";
type Params={search?:string;status?:string};
type Row={id:string;title:string;sector:string|null;city:string|null;province:string|null;verification_status:string;is_published:boolean;created_at:string;updated_at:string|null;advert_image_path:string|null;company_id:string|null;slug:string|null};
type Application={job_id:string};

export default async function AdminJobsPage({searchParams}:{searchParams:Promise<Params>}){
 const p=await searchParams;
 const identity=await requireAdminPermission("jobs.manage","/admin/jobs");
 const permissions=await getEffectiveAdminPermissions(identity);
 const supabase=await createClient();
 const {data,error}=await supabase.from("jobs").select("id,title,sector,city,province,verification_status,is_published,created_at,updated_at,advert_image_path,company_id,slug").order("updated_at",{ascending:false,nullsFirst:false}).limit(200);
 const all=(data??[]) as Row[];
 const ids=all.map(job=>job.id);
 const {data:applicationRows,error:applicationError}=ids.length
  ?await supabase.from("job_applications").select("job_id").in("job_id",ids).limit(10000)
  :{data:[] as Application[],error:null};
 const counts=new Map<string,number>();
 for(const item of (applicationRows??[]) as Application[])counts.set(item.job_id,(counts.get(item.job_id)??0)+1);
 const companyIds=[...new Set(all.map(row=>row.company_id).filter((id):id is string=>Boolean(id)))];
 const {data:companies}=companyIds.length
  ?await supabase.from("companies").select("id,canonical_name").in("id",companyIds)
  :{data:[] as {id:string;canonical_name:string}[]};
 const companyNames=new Map((companies??[]).map(row=>[row.id,row.canonical_name]));
 const term=(p.search??"").trim().toLowerCase();
 const rows=all.filter(row=>(!term || [row.title,row.sector,row.city,row.province,row.company_id?companyNames.get(row.company_id):null].filter(Boolean).join(" ").toLowerCase().includes(term))
  &&(!p.status||p.status==="all"||(p.status==="published"?row.is_published:p.status==="unpublished"?!row.is_published:row.verification_status===p.status)));
 const pending=all.filter(row=>row.verification_status==="pending").length;
 const published=all.filter(row=>row.is_published).length;
 const totalApplications=Array.from(counts.values()).reduce((sum,count)=>sum+count,0);
 return <main className="vc-admin-page"><SiteHeader/>
  <section className="vc-admin-banner"><div className="shell"><span className="section-kicker">VETCONNECT HR</span><h1>Jobs workspace</h1><p>Jobs, employer records, advertisement images, approvals and applications in one place.</p></div></section>
  <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
   <div className="admin-control-content vc-admin-main">
    <section className="vc-admin-panel">
     <div className="vc-panel-header"><div><h2>Recruitment overview</h2><p>Latest 200 updated job records. Existing approval safeguards remain in force.</p></div></div>
     <div className="management-links">
      {permissions.has("jobs.create")&&<Link className="button button-primary" href="/admin/create?type=job">+ New job</Link>}
      {permissions.has("companies.create")&&<Link className="button button-secondary" href="/admin/create?type=company">+ New company</Link>}
      <Link className="button button-secondary" href="/admin/applications">Applications</Link>
      <Link className="button button-secondary" href="/admin/jobs-media">Job images</Link>
      <Link className="button button-secondary" href="/admin/reviews#jobs-review">Approval queue</Link>
     </div>
     <p><strong>{all.length}</strong> recent jobs · <strong>{pending}</strong> pending · <strong>{published}</strong> published · <strong>{applicationError?"Unavailable":totalApplications}</strong> applications in loaded records{applicationRows?.length===10000?" (first 10,000 only)":""}</p>
     <form className="vc-admin-filter-row" method="get"><div><label htmlFor="job-query">Search job, employer, sector or city</label><input id="job-query" name="search" defaultValue={p.search??""}/></div>
      <div><label htmlFor="job-status">Status</label><select id="job-status" name="status" defaultValue={p.status??"all"}><option value="all">All jobs</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="published">Published</option><option value="unpublished">Not published</option></select></div>
      <button className="button button-primary">Filter</button><Link href="/admin/jobs">Clear</Link>
     </form>
     {error?<p role="alert">Jobs could not be loaded. Nothing has been changed.</p>:
      <div style={{display:"grid",gap:"0.65rem"}}>
       {rows.map(job=><article key={job.id} style={{display:"flex",gap:"0.85rem",alignItems:"center",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"0.8rem",background:"#fff",flexWrap:"wrap"}}>
        <div aria-label={job.advert_image_path?"Advertisement image attached":"No advertisement image"} style={{width:68,height:68,borderRadius:8,background:"#f1f5f9",border:"1px solid #dce4ec",display:"grid",placeItems:"center",textAlign:"center",fontSize:11,color:"#31546c",flexShrink:0,overflow:"hidden"}}>
         {job.advert_image_path&&job.is_published&&job.verification_status==="approved"?<img src={`/api/jobs/${job.id}/advertisement`} alt={`Advertisement for ${job.title}`} width={68} height={68} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:job.advert_image_path?"Image saved":"No image"}
        </div>
        <div style={{flex:"1 1 270px",minWidth:0}}>
         <h3 style={{margin:"0 0 0.3rem",fontSize:"1rem"}}><Link href={`/admin/jobs/${job.id}`}>{job.title}</Link></h3>
         <p style={{margin:"0 0 0.25rem",fontSize:"0.85rem"}}>{job.company_id?companyNames.get(job.company_id)||"Employer record":"No employer"} · {job.sector||"Sector not specified"} · {[job.city,job.province].filter(Boolean).join(", ")||"Location not specified"}</p>
         <small>{job.verification_status} · {job.is_published?"Published":"Not published"} · {counts.get(job.id)??0} application(s) · Updated {new Date(job.updated_at||job.created_at).toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})}</small>
        </div>
        <div className="management-links" style={{margin:0}}>
         <Link href={`/admin/jobs/${job.id}`}>Open</Link>
         {job.verification_status==="pending"&&<Link href={`/admin/reviews#job-${job.id}`}>Approve / reject</Link>}
         <Link href={`/admin/jobs-media?job_id=${job.id}`}>Image</Link>
         <Link href={`/admin/applications?job_id=${job.id}`}>Applications ({counts.get(job.id)??0})</Link>
         {job.is_published&&job.slug&&<Link href={`/jobs/${job.slug}`}>Public view</Link>}
        </div>
       </article>)}
       {rows.length===0&&<p>No matching jobs.</p>}
      </div>}
     <p style={{fontSize:"0.8rem",marginTop:"1rem"}}>Approval and publication continue through the existing protected workflow. Closing and editing live vacancies need separate audited actions; no direct database status changes are made on this screen.</p>
    </section>
   </div>
  </div></section><SiteFooter/></main>;
}
