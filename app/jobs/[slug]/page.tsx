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
  let hasApplied = false;
  if (identity && job.id && !job.is_sample) {
    const supabase = await createClient();
    const [{data:saved},{data:application}] = await Promise.all([
      supabase.from("saved_jobs").select("job_id").eq("user_id", identity.userId).eq("job_id", job.id).maybeSingle(),
      supabase.from("job_applications").select("id").eq("candidate_user_id",identity.userId).eq("job_id",job.id).maybeSingle()
    ]);
    isSaved = Boolean(saved);
    hasApplied = Boolean(application);
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
  const careerRole=identity?.roles.includes("veterinarian") ? "veterinarian"
    : identity?.roles.includes("professional") ? "professional"
    : identity?.roles.includes("candidate") ? "candidate" : null;
  const canApply=Boolean(careerRole);
  let profileStatus: string|null=null;
  let profileExists=false;
  if(identity && careerRole){
    const supabase=await createClient();
    const table=careerRole==="veterinarian"?"veterinarian_profiles":"professional_profiles";
    const {data:profile,error:profileError}=await supabase.from(table)
      .select("verification_status").eq("user_id",identity.userId).maybeSingle();
    if(!profileError){
      profileExists=Boolean(profile);
      profileStatus=profile?.verification_status??null;
    }
  }
  const profileApproved=canApply && profileStatus==="approved";
  const hasCv=Boolean(builder?.full_name || (cvDocuments??[]).length>0);
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
          closed?
          <div className="job-eligibility-box" role="status">
            <h3>Applications closed</h3><p>The advertised deadline has passed.</p>
            <Link href="/jobs">Find current jobs</Link>
          </div>:
          <>
            {!identity && <div className="job-eligibility-box" role="status">
              <h3>Sign in to apply</h3>
              <p>Login is mandatory to upload a CV and apply. Use your own verified email and approved career profile.</p>
              <div className="job-cv-actions">
                <Link className="button button-primary" href={"/login?next="+encodeURIComponent("/jobs/"+job.slug+"#apply-job")}>Sign in as a candidate</Link>
                <Link className="button button-secondary" href="/register?role=candidate#registration">Create job seeker account</Link>
              </div>
            </div>}
            {identity && !canApply && <div className="job-eligibility-box" role="status">
              <h3>Job seeker account required</h3>
              <p>This signed-in account has no Candidate, Professional or Veterinarian role. Staff or employer accounts cannot submit job applications.</p>
              <p>Use a separate job seeker account to apply. This does not change your existing account or its permissions.</p>
              <div className="job-cv-actions">
                <Link className="button button-primary" href="/register?role=candidate#registration">Register a job seeker account</Link>
                <Link className="button button-secondary" href="/dashboard">Account dashboard</Link>
              </div>
            </div>}
            {identity && canApply && !profileApproved && <div className="job-eligibility-box" role="status">
              <h3>{!profileExists?"Complete your career profile":
                profileStatus==="rejected"?"Profile needs corrections":
                profileStatus==="pending"?"Profile awaiting approval":"Check profile verification"}</h3>
              <p>{!profileExists?
                "Save the required professional information so your profile can enter the VetConnect review process.":
                profileStatus==="rejected"?
                "Your profile requires changes before you can apply. Review the feedback in your professional workspace.":
                "Your career profile must be approved by VetConnect before applications can be submitted."}</p>
              <div className="job-cv-actions">
                <Link className="button button-primary" href="/dashboard/professional">Complete / Review profile</Link>
                <Link className="button button-secondary" href="/dashboard/career">View saved CVs</Link>
              </div>
            </div>}
            {identity && profileApproved && hasApplied && <div className="job-eligibility-box" role="status">
              <h3>Application already submitted</h3>
              <p>You have applied to this job. See its status and selected CV in your Career Workspace.</p>
              <Link className="button button-primary" href="/dashboard/career">View my applications</Link>
            </div>}
            {identity && profileApproved && !hasApplied && !hasCv && <div className="job-eligibility-box" role="status">
              <h3>Choose or create your CV</h3>
              <p>Your profile is approved. Save a CV before submitting this application.</p>
              <div className="job-cv-actions">
                <Link className="button button-primary" href="/dashboard/career#my-cvs">Upload a CV</Link>
                <Link className="button button-secondary" href="/dashboard/career/cv">Create / Edit CV</Link>
              </div>
            </div>}
            {identity && profileApproved && !hasApplied && hasCv && <>
              <p>Select a saved CV or your VetConnect CV Builder profile. Your CV will accompany this job application.</p>
              <div className="job-cv-actions">
                <Link className="button button-secondary" href="/dashboard/career#my-cvs">Manage saved CVs</Link>
                <Link className="button button-secondary" href="/dashboard/career/cv">Create or edit CV</Link>
              </div>
              <form action={applyToJobAction} className="job-application-form">
                <input type="hidden" name="slug" value={job.slug}/>
                <input type="hidden" name="job_id" value={job.id}/>
                <label htmlFor="cv_choice">Select CV for this application *</label>
                <select id="cv_choice" name="cv_choice" required defaultValue="">
                  <option value="">Choose your CV</option>
                  {builder?.full_name&&<option value="profile_cv">My VetConnect CV: {builder.full_name}</option>}
                  {(cvDocuments??[]).map((doc,index)=>
                    <option key={doc.id} value={"saved:"+doc.id}>Saved CV {index+1} · {new Date(doc.created_at).toLocaleDateString("en-PK")}{doc.is_current?" (Current)":""}</option>)}
                </select>
                <label htmlFor="cover_note">Short application note (optional)</label>
                <textarea id="cover_note" name="cover_note" maxLength={3000}
                  placeholder="Briefly explain your fit for this role."/>
                <label htmlFor="apply_confirm_email">Confirm your verified VetConnect login email *</label>
                <input id="apply_confirm_email" type="email" name="confirm_email" autoComplete="email" required maxLength={254} placeholder={identity.email||"Verified account email"}/>
                <p className="form-help">Enter your own registered account email. Other addresses are not accepted.</p>
                <FormSubmitButton pendingLabel="Submitting application...">Submit application with CV</FormSubmitButton>
              </form>
            </>}
            {identity && <form action={toggleSavedJobAction} className="save-job-form">
              <input type="hidden" name="slug" value={job.slug}/>
              <input type="hidden" name="job_id" value={job.id}/>
              <button className="button button-secondary button-full" type="submit">
                {isSaved?"Remove from saved jobs":"Save job for later"}
              </button>
            </form>}
          </>}
      </div>
    </div></section><SiteFooter/></main>;
}
