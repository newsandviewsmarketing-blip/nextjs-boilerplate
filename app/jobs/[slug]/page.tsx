import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sampleJobs, type PublicJob } from "@/lib/jobs";
import { applyToJobAction, toggleSavedJobAction } from "../actions";
import { getCurrentIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function loadJob(slug: string): Promise<PublicJob | null> {
  const sample = sampleJobs.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("id, slug, title, description, sector, city, province, employment_type, minimum_qualification, minimum_experience, deadline, company_user_id, company_name").eq("slug", slug).maybeSingle();
  if (!data?.id) return sample ?? null;
  const { data: coverage } = await supabase.from("job_coverage").select("job_id,scope,province,display_text").eq("job_id",data.id).maybeSingle();
  const {data:media}=await supabase.from("jobs").select("advert_image_path,advert_image_mime").eq("id",data.id).maybeSingle();
  return {...data,coverage,image_available:Boolean(media?.advert_image_path && ["image/jpeg","image/png","image/webp"].includes(media?.advert_image_mime??""))} as PublicJob;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) return { title: "Veterinary Job" };
  return {
    title: `${job.title} at ${job.company_name} in ${job.coverage?.display_text || job.city || job.province || "Pakistan"}`,
    description: job.description,
    alternates: { canonical: `/jobs/${slug}` },
    robots: job.is_sample ? { index: false, follow: true } : undefined,
  };
}

export default async function JobDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { slug } = await params;
  const messages = await searchParams;
  const job = await loadJob(slug);
  if (!job) notFound();
  const identity = await getCurrentIdentity();
  let isSaved = false;
  if (identity && job.id && !job.is_sample) {
    const supabase = await createClient();
    const { data } = await supabase.from("saved_jobs").select("job_id").eq("user_id", identity.userId).eq("job_id", job.id).maybeSingle();
    isSaved = Boolean(data);
  }
  const {data:cvDocuments} = identity
    ? await (await createClient()).from("career_documents")
      .select("id,created_at,is_current").eq("professional_user_id",identity.userId)
      .eq("document_type","cv").order("created_at",{ascending:false}).limit(20)
    : {data:[]};
  const {data:builder} = identity
    ? await (await createClient()).from("career_cv_profiles")
      .select("full_name").eq("user_id",identity.userId).maybeSingle()
    : {data:null};
  const canApply=Boolean(identity?.roles.some(role=>["candidate","professional","veterinarian"].includes(role)));
  const closed=Boolean(job.deadline && job.deadline<new Date().toISOString().slice(0,10));
  const imageUrl=job.id && job.image_available ? "/api/jobs/"+job.id+"/advertisement":null;

  return <main><SiteHeader />
    <section className="page-hero job-detail-hero"><div className="shell">
      <span className="section-kicker">{job.sector==="Punjab"?"VETERINARY CAREER":job.sector||"VETERINARY CAREER"}</span>
      <h1>{job.title}</h1>
      <p>{job.company_name} • {job.coverage?.display_text || job.city || job.province || "Pakistan"} • {job.employment_type}</p>
      <div className="profile-chips">
        {job.minimum_qualification&&<span>{job.minimum_qualification}</span>}
        <span>{job.minimum_experience===null?"Experience not specified":job.minimum_experience+"+ years"}</span>
        {job.deadline&&<span>Deadline: {job.deadline}</span>}
      </div>
      {!closed && !job.is_sample && <a className="button button-primary job-mobile-apply-link" href="#apply-job">Apply for this job ↓</a>}
    </div></section>
    <section className="section compact-section"><div className="shell job-detail-grid">
      <div className="backend-form-card job-opportunity-card">
        <h2>Opportunity details</h2>
        <p className="job-description">{job.description}</p>
        <dl className="product-specs">
          <div><dt>Employer</dt><dd>{job.company_name}</dd></div>
          <div><dt>Location</dt><dd>{job.coverage?.display_text || [job.city,job.province].filter(Boolean).join(", ") || "Pakistan"}</dd></div>
          <div><dt>Employment type</dt><dd>{job.employment_type}</dd></div>
          <div><dt>Minimum qualification</dt><dd>{job.minimum_qualification||"Not specified"}</dd></div>
          <div><dt>Minimum experience</dt><dd>{job.minimum_experience===null?"Not specified":job.minimum_experience+" years"}</dd></div>
          {job.deadline&&<div><dt>Deadline</dt><dd>{job.deadline}</dd></div>}
        </dl>
        {imageUrl&&<figure className="job-advertisement">
          <Image src={imageUrl} unoptimized width={960} height={1180}
            alt={"Approved job advertisement for "+job.title+" by "+job.company_name}/>
          <figcaption>Original approved job advertisement image</figcaption>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">View full advertisement</a>
        </figure>}
        {job.company_user_id&&<Link className="button button-secondary" href={"/companies/"+job.company_user_id}>View employer profile</Link>}
      </div>
      <div className="backend-form-card job-apply-card" id="apply-job">
        <FormMessage {...messages}/>
        <span className="section-kicker">APPLY THROUGH VETCONNECT</span>
        <h2>Apply using your CV.</h2>
        {job.is_sample||!job.id?
          <p className="setup-notice">This is an example listing, not an open vacancy.</p>:
          closed?<p className="form-message form-message-error">This job is closed. The advertised deadline has passed.</p>:
          <>
            <p>Choose a saved CV or create one with your VetConnect profile before applying.</p>
            <div className="job-cv-actions">
              <Link className="button button-secondary" href="/dashboard/career">My saved CVs / Upload CV</Link>
              <Link className="button button-secondary" href="/dashboard/career/cv">Create or edit CV</Link>
            </div>
            {!identity&&<p className="form-message form-message-error">
              <Link href={"/login?next="+encodeURIComponent("/jobs/"+job.slug)}>Sign in</Link> to apply using a career profile.</p>}
            {identity&&!canApply&&<p className="form-message form-message-error">
              A candidate, professional or veterinarian career profile is required to apply.
              <Link href="/dashboard"> Open your dashboard</Link>.
            </p>}
            <form action={applyToJobAction} className="job-application-form">
              <input type="hidden" name="slug" value={job.slug}/>
              <input type="hidden" name="job_id" value={job.id}/>
              <label htmlFor="cv_choice">Select CV for this application *</label>
              <select id="cv_choice" name="cv_choice" required defaultValue=""
                disabled={!identity||!canApply}>
                <option value="">Choose your CV</option>
                {builder?.full_name&&<option value="profile_cv">My VetConnect CV: {builder.full_name}</option>}
                {(cvDocuments??[]).map((doc,index)=>
                  <option key={doc.id} value={"saved:"+doc.id}>Saved CV {index+1} · {new Date(doc.created_at).toLocaleDateString("en-PK")}{doc.is_current?" (Current)":""}</option>)}
              </select>
              {(cvDocuments??[]).length===0&&!builder?.full_name&&
                <p className="form-help">No saved CV yet. Upload a PDF/DOC/DOCX or create your CV first.</p>}
              <label htmlFor="cover_note">Short application note (optional)</label>
              <textarea id="cover_note" name="cover_note" maxLength={3000}
                placeholder="Briefly explain your fit for this role."/>
              <FormSubmitButton pendingLabel="Submitting application...">Submit application with CV</FormSubmitButton>
            </form>
            <form action={toggleSavedJobAction} className="save-job-form">
              <input type="hidden" name="slug" value={job.slug}/>
              <input type="hidden" name="job_id" value={job.id}/>
              <button className="button button-secondary button-full" type="submit">
                {isSaved?"Remove from saved jobs":"Save job"}
              </button>
            </form>
          </>}
      </div>
    </div></section><SiteFooter/></main>;
}
