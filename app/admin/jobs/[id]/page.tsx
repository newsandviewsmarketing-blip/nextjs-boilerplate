import Link from "next/link";
import {notFound} from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import AdminNav from "../../components/AdminNav";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function AdminJobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const identity=await requireAdminPermission("jobs.manage","/admin/jobs");
  const supabase=await createClient();
  const {data:job,error}=await supabase.from("jobs").select("id,title,description,sector,city,province,district,tehsil,minimum_qualification,minimum_experience,employment_type,deadline,verification_status,is_published,slug,created_at").eq("id",id).maybeSingle();
  if(error||!job)notFound();
  const details=[
    ["Sector",job.sector],["Location",[job.city,job.district,job.province].filter(Boolean).join(", ")],
    ["Employment",job.employment_type],["Qualification",job.minimum_qualification],
    ["Experience",job.minimum_experience===null?"Not specified":String(job.minimum_experience)+" years"],
    ["Deadline",job.deadline],["Submitted",new Date(job.created_at).toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})]
  ];
  return <main className="vc-admin-page"><SiteHeader/><section className="vc-admin-banner"><div className="shell"><span className="section-kicker">JOB DOSSIER</span><h1>{job.title}</h1><p>{job.verification_status} · {job.is_published?"Published":"Not published"}</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div><div className="admin-control-content vc-admin-main">
      <section className="vc-admin-panel"><div className="vc-panel-header"><div><h2>Recruitment details</h2><p>Administrative information for record verification and follow-up.</p></div>
        <Link href="/admin/jobs">All jobs</Link></div>
        <dl className="review-details">{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??"Not supplied"}</dd></div>)}</dl>
        <p className="cv-preserve-lines">{job.description}</p>
        <div className="management-links">{job.verification_status==="pending"&&<Link className="button button-primary" href={"/admin/reviews#job-"+job.id}>Open pending approval</Link>}
          {job.is_published&&job.slug&&<Link className="button button-secondary" href={"/jobs/"+job.slug}>Open public listing</Link>}
        </div>
      </section>
    </div></div></section><SiteFooter/></main>;
}
