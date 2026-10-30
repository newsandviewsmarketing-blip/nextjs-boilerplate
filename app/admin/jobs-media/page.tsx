import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import AdminNav from "../components/AdminNav";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {uploadExistingJobImageAction,linkExistingJobDocumentAction} from "./actions";
export const dynamic="force-dynamic";
export default async function AdminJobMedia({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
 const params=await searchParams;
 const identity=await requireAdminPermission("jobs.manage","/admin/jobs-media");
 const supabase=await createClient();
 const {data:jobs,error}=await supabase.from("jobs")
   .select("id,title,sector,is_published,verification_status,advert_image_path")
   .order("created_at",{ascending:false}).limit(100);
 const ids=(jobs??[]).map(j=>j.id);
 const {data:docs}=ids.length?await supabase.from("admin_record_documents")
   .select("id,entity_id,original_name,mime_type,document_kind")
   .eq("entity_type","job").in("entity_id",ids):{data:[]};
 return <main><SiteHeader/>
  <section className="dashboard-hero"><div className="shell">
   <span className="section-kicker">ADMIN JOB MEDIA</span>
   <h1>Job advertisement images.</h1>
   <p>Upload the original job advertisement or approve an existing image attached to that same job. Private supporting documents are never made public automatically.</p>
  </div></section>
  <section className="section compact-section"><div className="shell admin-control-layout">
   <AdminNav roles={identity.roles}/>
   <div className="admin-control-content">
    <FormMessage error={params.error||error?.message} message={params.message}/>
    <div className="backend-form-card">
      <h2>Update advertisement of an existing job</h2>
      <form className="profile-form" action={uploadExistingJobImageAction}>
       <div className="form-span-2"><label htmlFor="job-media-id">Job</label>
        <select id="job-media-id" name="job_id" required><option value="">Select job</option>
          {(jobs??[]).map(j=><option key={j.id} value={j.id}>{j.title} ({j.verification_status})</option>)}
        </select></div>
       <div className="form-span-2"><label htmlFor="job-media-file">Original job advertisement image</label>
        <input id="job-media-file" name="job_ad_image" type="file" accept="image/jpeg,image/png,image/webp" required/>
       </div>
       <button className="button button-primary" type="submit">Save job advertisement image</button>
      </form>
    </div>
    <div className="backend-form-card">
      <h2>Uploaded image records by job</h2>
      <p>Only images assigned to their original job may be approved. This does not move or copy images between different jobs.</p>
      {(jobs??[]).map(j=><article key={j.id} className="job-media-admin-row">
        <h3>{j.title}</h3>
        <p>Status: {j.verification_status} · {j.is_published?"Published":"Not published"} · {j.advert_image_path?"Ad image attached":"No public ad image attached"}</p>
        {(docs??[]).filter(d=>d.entity_id===j.id).map(d=><div key={d.id}>
          <p>{d.original_name} <small>({d.document_kind}, {d.mime_type??"unknown"})</small></p>
          {["image/jpeg","image/png","image/webp"].includes(d.mime_type??"")&&
           <form action={linkExistingJobDocumentAction}>
            <input type="hidden" name="job_id" value={j.id}/>
            <input type="hidden" name="document_id" value={d.id}/>
            <button className="button button-secondary" type="submit">Use this image for this job</button>
           </form>}
        </div>)}
       </article>)}
      <Link href="/admin/reviews">Go to Job Review Queue</Link>
    </div>
   </div>
  </div></section><SiteFooter/></main>;
}