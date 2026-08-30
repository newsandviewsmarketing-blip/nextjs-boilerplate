import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ApplicationRow = {
  id: string;
  job_id: string;
  status: string;
  cover_note: string | null;
  applied_at: string;
};

type SavedRow = { job_id: string; created_at: string };
type MatchRow = { job_id: string; match_score: number; explanation: string; calculated_at: string };

type JobRow = {
  id: string;
  slug: string;
  title: string;
  sector: string | null;
  city: string | null;
  province: string | null;
  employment_type: string;
  company_user_id: string | null;
};

export default async function CareerWorkspacePage() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/career");

  const eligible = identity.roles.some((role) =>
    ["veterinarian", "professional", "candidate"].includes(role),
  );
  if (!eligible) {
    redirect("/dashboard?error=Career%20workspace%20is%20available%20to%20veterinarians%20and%20professional%20candidates.");
  }

  const supabase = await createClient();
  const [applicationResult, savedResult, matchResult] = await Promise.all([
    supabase
      .from("job_applications")
      .select("id, job_id, status, cover_note, applied_at")
      .eq("candidate_user_id", identity.userId)
      .order("applied_at", { ascending: false }),
    supabase
      .from("saved_jobs")
      .select("job_id, created_at")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_matches")
      .select("job_id, match_score, explanation, calculated_at")
      .eq("candidate_user_id", identity.userId)
      .order("match_score", { ascending: false })
      .limit(12),
  ]);

  const applicationRows = (applicationResult.data ?? []) as ApplicationRow[];
  const savedRows = (savedResult.data ?? []) as SavedRow[];
  const matchRows = (matchResult.data ?? []) as MatchRow[];
  const jobIds = [...new Set([
    ...applicationRows.map((row) => row.job_id),
    ...savedRows.map((row) => row.job_id),
    ...matchRows.map((row) => row.job_id),
  ])];

  let jobs: JobRow[] = [];
  if (jobIds.length) {
    const { data } = await supabase
      .from("jobs")
      .select("id, slug, title, sector, city, province, employment_type, company_user_id")
      .in("id", jobIds);
    jobs = (data ?? []) as JobRow[];
  }
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">CAREER WORKSPACE</span>
            <h1>Jobs, matches and applications.</h1>
            <p>Track your VetConnect career activity from one place.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="button button-primary" href="/jobs">Browse jobs</Link>
            <Link className="button button-secondary" href="/dashboard/professional">Professional profile</Link>
            <Link className="button button-secondary" href="/dashboard">Account dashboard</Link>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          {(applicationResult.error || savedResult.error || matchResult.error) && (
            <div className="form-message form-message-error">{applicationResult.error?.message || savedResult.error?.message || matchResult.error?.message}</div>
          )}
          <div className="admin-summary">
            <article><b>{applicationRows.length}</b><span>Total applications</span></article>
            <article><b>{applicationRows.filter((row) => row.status === "shortlisted").length}</b><span>Shortlisted</span></article>
            <article><b>{applicationRows.filter((row) => row.status === "interview").length}</b><span>Interview stage</span></article>
            <article><b>{savedRows.length}</b><span>Saved jobs</span></article>
            <article><b>{matchRows.length}</b><span>Calculated matches</span></article>
          </div>

          <div className="workspace-two-column workspace-heading-gap">
            <section>
              <div className="section-heading"><span className="section-kicker">MY APPLICATIONS</span><h2>Application status.</h2><p>Employers move applications through the recruitment pipeline.</p></div>
              {applicationRows.length === 0 ? (
                <div className="empty-state"><h2>No applications yet.</h2><p>Browse approved opportunities and apply with your VetConnect professional profile.</p><Link className="button button-primary" href="/jobs">Find jobs</Link></div>
              ) : (
                <div className="admin-data-list">
                  {applicationRows.map((application) => {
                    const job = jobMap.get(application.job_id);
                    return <article key={application.id}><div className="admin-data-main"><div className="admin-data-title"><span className="module-tag">{job?.sector || "Veterinary career"}</span><h2>{job?.title || "Job application"}</h2></div><p>{[job?.city, job?.province, job?.employment_type].filter(Boolean).join(" · ") || "VetConnect job"}</p><div className="status-cluster"><span className={`status-pill status-${application.status}`}>{application.status.replaceAll("_", " ")}</span><span className="status-pill">Applied {new Date(application.applied_at).toLocaleDateString("en-PK")}</span></div></div>{job?.slug && <Link className="button button-secondary" href={`/jobs/${job.slug}`}>View job</Link>}</article>;
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="section-heading"><span className="section-kicker">SAVED JOBS</span><h2>Opportunities to revisit.</h2></div>
              {savedRows.length === 0 ? <div className="empty-state"><p>No saved jobs yet.</p></div> : <div className="admin-data-list">{savedRows.map((saved) => { const job = jobMap.get(saved.job_id); return <article key={saved.job_id}><div className="admin-data-main"><div className="admin-data-title"><span className="module-tag">{job?.sector || "Career"}</span><h2>{job?.title || "Saved job"}</h2></div><p>{[job?.city, job?.province, job?.employment_type].filter(Boolean).join(" · ")}</p><span className="status-pill">Saved {new Date(saved.created_at).toLocaleDateString("en-PK")}</span></div>{job?.slug && <Link className="button button-secondary" href={`/jobs/${job.slug}`}>Open</Link>}</article>; })}</div>}
            </section>
          </div>

          <section className="workspace-heading-gap">
            <div className="section-heading"><span className="section-kicker">JOB MATCHES</span><h2>Profile-based opportunity matches.</h2><p>Match records are calculated from the structured career data already stored in VetConnect.</p></div>
            {matchRows.length === 0 ? <div className="empty-state"><h2>No calculated matches yet.</h2><p>Complete your professional profile so future matching has standardized education, skills and experience data.</p><Link className="button button-primary" href="/dashboard/professional">Complete professional profile</Link></div> : <div className="company-grid">{matchRows.map((match) => { const job = jobMap.get(match.job_id); return <article key={match.job_id}><span className="module-tag">{job?.sector || "Veterinary career"}</span><h3>{job?.title || "Matched opportunity"}</h3><p>{match.explanation}</p><div className="status-cluster"><span className="status-pill status-approved">{Number(match.match_score).toFixed(0)}% match</span><span className="status-pill">{[job?.city, job?.province].filter(Boolean).join(", ") || "Pakistan"}</span></div>{job?.slug && <Link className="button button-primary button-full" href={`/jobs/${job.slug}`}>View opportunity</Link>}</article>; })}</div>}
          </section>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
