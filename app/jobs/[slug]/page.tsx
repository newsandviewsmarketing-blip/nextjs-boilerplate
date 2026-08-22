import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sampleJobs, type PublicJob } from "@/lib/jobs";
import { applyToJobAction } from "../actions";

export const dynamic = "force-dynamic";

async function loadJob(slug: string): Promise<PublicJob | null> {
  const sample = sampleJobs.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("id, slug, title, description, sector, city, province, employment_type, minimum_qualification, minimum_experience, deadline, company_user_id, company_name").eq("slug", slug).maybeSingle();
  return (data as PublicJob | null) ?? sample ?? null;
}

export default async function JobDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { slug } = await params; const messages = await searchParams; const job = await loadJob(slug); if (!job) notFound();
  return <main><SiteHeader /><section className="page-hero"><div className="shell"><span className="section-kicker">{job.sector || "VETERINARY CAREER"}</span><h1>{job.title}</h1><p>{job.company_name} • {job.city || "Pakistan"} • {job.employment_type}</p><div className="profile-chips">{job.minimum_qualification && <span>{job.minimum_qualification}</span>}<span>{job.minimum_experience}+ years</span>{job.deadline && <span>Deadline: {job.deadline}</span>}</div></div></section>
    <section className="section compact-section"><div className="shell two-col"><div className="backend-form-card"><h2>Opportunity details</h2><p>{job.description}</p><dl className="product-specs"><div><dt>Employer</dt><dd>{job.company_name}</dd></div><div><dt>Location</dt><dd>{[job.city, job.province].filter(Boolean).join(", ") || "Pakistan"}</dd></div><div><dt>Employment type</dt><dd>{job.employment_type}</dd></div><div><dt>Minimum qualification</dt><dd>{job.minimum_qualification || "See job description"}</dd></div><div><dt>Minimum experience</dt><dd>{job.minimum_experience} years</dd></div></dl>{job.company_user_id && <Link className="button button-secondary" href={`/companies/${job.company_user_id}`}>View employer profile</Link>}</div>
      <div className="backend-form-card"><FormMessage {...messages} /><span className="section-kicker">APPLY THROUGH VETCONNECT</span><h2>Submit your career profile.</h2>{job.is_sample || !job.id ? <div className="setup-notice"><p>This is sample data. Applications activate when an approved employer publishes the job.</p></div> : <form action={applyToJobAction}><input type="hidden" name="slug" value={job.slug} /><input type="hidden" name="job_id" value={job.id} /><label htmlFor="cover_note">Short application note</label><textarea id="cover_note" name="cover_note" placeholder="Briefly explain your fit for this role." /><FormSubmitButton pendingLabel="Submitting application...">Apply now</FormSubmitButton></form>}</div></div></section><SiteFooter /></main>;
}
