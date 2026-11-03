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
import { absoluteUrl, seoDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function loadJob(slug: string): Promise<PublicJob | null> {
  const sample = sampleJobs.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("id, slug, title, description, sector, city, province, employment_type, minimum_qualification, minimum_experience, deadline, company_user_id, company_id, company_name").eq("slug", slug).maybeSingle();
  if (!data?.id) return sample ?? null;
  const { data: coverage } = await supabase.from("job_coverage").select("job_id,scope,province,display_text").eq("job_id",data.id).maybeSingle();
  const {data:media}=await supabase.from("jobs").select("advert_image_path,advert_image_mime,country,work_mode,salary_min,salary_max,salary_currency,salary_period,created_at").eq("id",data.id).maybeSingle();
  return {...data,...media,coverage,image_available:Boolean(media?.advert_image_path && ["image/jpeg","image/png","image/webp"].includes(media?.advert_image_mime??""))} as PublicJob;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) return { title: "Veterinary Job" };
  return {
    title: `${job.title} at ${job.company_name} in ${job.coverage?.display_text || job.city || job.province || "Pakistan"}`,
    description: seoDescription(job.description, "Veterinary and animal-health opportunity on VetConnect Pakistan."),
    openGraph: {title: job.title, description: seoDescription(job.description, "VetConnect Pakistan job opportunity."), url: `/jobs/${slug}`, type: "website"},
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
  const {data:employerContact}=job.company_id ? await (await createClient()).from("companies").select("public_phone,verification_status,is_published").eq("id",job.company_id).maybeSingle() : {data:null};
  const publicPhone=employerContact?.verification_status==="approved" && employerContact?.is_published ? employerContact.public_phone : null;
  const callNumber=publicPhone?.replace(/[^+0-9]/g,"")||"";
  const canonicalJobUrl=absoluteUrl("/jobs/"+job.slug);
  const shareText=job.title+" at "+job.company_name;
  const whatsappHref="https://wa.me/?text="+encodeURIComponent(shareText+" "+canonicalJobUrl);
  const emailHref="mailto:?subject="+encodeURIComponent(shareText)+"&body="+encodeURIComponent("View this job: "+canonicalJobUrl);
  const careerRole=identity?.roles.includes("veterinarian") ? "veterinarian"
    : identity?.roles.includes("professional") ? "professional"
    : identity?.roles.includes("candidate") ? "candidate" : null;
  const canApply=Boolean(careerRole);
  const closed=Boolean(job.deadline && job.deadline<new Date().toISOString().slice(0,10));
  const imageUrl=job.id && job.image_available ? "/api/jobs/"+job.id+"/advertisement":null;
  // Structured data is restricted to real, public, open jobs with a verified posting date.
  const publicJob = job as PublicJob & {created_at?:string};
  const country = (job.country || "Pakistan").trim().toLowerCase();
  const inPakistan = country === "pakistan" || country === "pk";
  const isRemote = job.work_mode?.trim().toLowerCase() === "remote";
  const showJobSchema = Boolean(!job.is_sample && job.id && !closed && publicJob.created_at && inPakistan && (isRemote || job.city || job.province));
  const employment = new Map([["full-time","FULL_TIME"],["part-time","PART_TIME"],["contract","CONTRACTOR"],["internship","INTERN"],["temporary","TEMPORARY"],["volunteer","VOLUNTEER"]]).get(job.employment_type?.trim().toLowerCase() ?? "");
  const schema = showJobSchema ? {
    "@context":"https://schema.org",
    "@type":"JobPosting",
    title:job.title,
    description:job.description,
    datePosted:new Date(publicJob.created_at!).toISOString(),
    url:absoluteUrl("/jobs/"+job.slug),
    identifier:{"@type":"PropertyValue",name:job.company_name,value:job.id},
    hiringOrganization:{"@type":"Organization",name:job.company_name},
    ...(job.deadline?{validThrough:job.deadline}:{}),
    ...(employment?{employmentType:employment}:{}),
    ...(isRemote?{
      jobLocationType:"TELECOMMUTE",
      applicantLocationRequirements:{"@type":"Country",name:"Pakistan"}
    }:{
      jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",
        ...(job.city?{addressLocality:job.city}:{}),
        ...(job.province?{addressRegion:job.province}:{}),
        addressCountry:"PK"}}
    }),
    ...(job.salary_min!=null || job.salary_max!=null ? {baseSalary:{
      "@type":"MonetaryAmount",currency:job.salary_currency||"PKR",
      value:{"@type":"QuantitativeValue",
        ...(job.salary_min!=null?{minValue:job.salary_min}:{}),
        ...(job.salary_max!=null?{maxValue:job.salary_max}:{}),
        unitText:({month:"MONTH",year:"YEAR",hour:"HOUR",week:"WEEK",day:"DAY"} as Record<string,string>)[job.salary_period||"month"]||"MONTH"}
    }}:{})
  }:null;

  return <main>{schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>}<SiteHeader />
    <section className="page-hero job-detail-hero"><div className="shell">
      <span className="section-kicker">{job.sector==="Punjab"?"VETERINARY CAREER":job.sector||"VETERINARY CAREER"}</span>
      <h1>{job.title}</h1>
      <nav className="hero-actions" aria-label="Job contact and sharing">
        <a className="button button-secondary" href={whatsappHref} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        <a className="button button-secondary" href={emailHref}>Share by email</a>
        {publicPhone && callNumber.length>=10 && <a className="button button-secondary" href={"tel:"+callNumber}>Call employer: {publicPhone}</a>}
      </nav>
      <p><a href={canonicalJobUrl} className="text-link">Permanent job link</a></p>
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
          <div><dt>Country / work arrangement</dt><dd>{[job.country,job.work_mode].filter(Boolean).join(' / ')||'Not specified'}</dd></div>
          <div><dt>Salary</dt><dd>{job.salary_min!=null||job.salary_max!=null?`${job.salary_currency} ${job.salary_min??'Not specified'} to ${job.salary_max??'Not specified'} per ${job.salary_period}`:'Not disclosed'}</dd></div>
          <div><dt>Employment type</dt><dd>{job.employment_type}</dd></div>
          <div><dt>Minimum qualification</dt><dd>{job.minimum_qualification||"Not specified"}</dd></div>
          <div><dt>Minimum experience</dt><dd>{job.minimum_experience===null?"Not specified":job.minimum_experience+" years"}</dd></div>
          {job.deadline&&<div><dt>Deadline</dt><dd>{job.deadline}</dd></div>}
        </dl>
        {imageUrl&&<figure className="job-advertisement">
          <h3>Original employer job advertisement</h3>
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
              <p>Sign in with your verified VetConnect account to choose a saved CV or upload a new one and apply.</p>
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
            {identity && canApply && hasApplied && <div className="job-eligibility-box" role="status">
              <h3>Application already submitted</h3>
              <p>Your application is saved in VetConnect. See its status in your Career Workspace.</p>
              <Link className="button button-primary" href="/dashboard/career">View my applications</Link>
            </div>}
            {identity && canApply && !hasApplied && <>
              <p>Apply with your saved VetConnect CV, a CV from your private library, or upload a new CV here.</p>
              <div className="job-cv-actions">
                <Link className="button button-secondary" href="/dashboard/career#my-cvs">My CV library</Link>
                <Link className="button button-secondary" href="/dashboard/career/cv">Build or edit CV</Link>
              </div>
              <form action={applyToJobAction} className="job-application-form" encType="multipart/form-data">
                <input type="hidden" name="slug" value={job.slug}/>
                <input type="hidden" name="job_id" value={job.id}/>
                <label htmlFor="cv_choice">Select your CV method *</label>
                <select id="cv_choice" name="cv_choice" required defaultValue={!(builder?.full_name) && !(cvDocuments??[]).length ? "upload_cv" : ""}>
                  <option value="">Choose saved CV or upload</option>
                  {builder?.full_name&&<option value="profile_cv">My VetConnect CV: {builder.full_name}</option>}
                  {(cvDocuments??[]).map((doc,index)=>
                    <option key={doc.id} value={"saved:"+doc.id}>Saved CV {index+1} · {new Date(doc.created_at).toLocaleDateString("en-PK")}{doc.is_current?" (Current)":""}</option>)}
                  <option value="upload_cv">Upload a new CV with this application</option>
                </select>
                <label htmlFor="job-cv-upload">New CV file (required only for Upload a new CV)</label>
                <input id="job-cv-upload" name="cv_file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"/>
                <p className="form-help">PDF, Word, JPG or PNG; maximum 5 MB. Your CV is stored privately and shared only with authorized recruiting staff through VetConnect.</p>
                <label className="checkbox-line"><input type="checkbox" name="use_saved_letter"/>Use my saved cover letter instead of the note below</label>
                <p className="form-help"><Link href="/career/cover-letter">Review saved cover letter</Link> before selecting it.</p>
                <label htmlFor="cover_note">Short application note (optional)</label>
                <textarea id="cover_note" name="cover_note" maxLength={3000} placeholder="Briefly explain your interest in this role."/>
                <label htmlFor="apply_confirm_email">Confirm your verified VetConnect login email *</label>
                <input id="apply_confirm_email" type="email" name="confirm_email" autoComplete="email" required maxLength={254} placeholder={identity.email||"Verified account email"}/>
                <p className="form-help">The application is recorded first; an email notice is then sent to the approved employer contact when email delivery is configured. No CV is attached to email.</p>
                <FormSubmitButton pendingLabel="Submitting application...">Apply now with CV</FormSubmitButton>
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
