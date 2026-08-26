import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sampleJobs, type PublicJob } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Veterinary Jobs in Pakistan",
  description: "Find veterinary, livestock, poultry, dairy, animal-health, feed and allied jobs in Pakistan.",
  alternates: { canonical: "/jobs" },
};

export const dynamic = "force-dynamic";

async function loadJobs(): Promise<PublicJob[]> {
  if (!isSupabaseConfigured()) return sampleJobs;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_jobs")
    .select("id, slug, title, description, sector, city, province, employment_type, minimum_qualification, minimum_experience, deadline, company_user_id, company_name")
    .order("deadline", { ascending: true, nullsFirst: false });
  if (error || !data?.length) return sampleJobs;
  return data as PublicJob[];
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const params = await searchParams;
  const jobs = await loadJobs();
  const query = (params.q ?? "").toLowerCase();
  const visibleJobs = jobs.filter(
    (job) =>
      (!query ||
        `${job.title} ${job.company_name} ${job.sector ?? ""}`.toLowerCase().includes(query)) &&
      (!params.city || params.city === "All cities" || job.city === params.city),
  );
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))] as string[];
  const showingSamples = jobs.some((job) => job.is_sample);
  return (
    <main>
      <SiteHeader />
      <section className="page-hero jobs-hero">
        <div className="shell">
          <span className="section-kicker">VETERINARY JOBS & TALENT</span>
          <h1>Connect employers with the right veterinary talent.</h1>
          <p>
            Designed for animal-health companies, clinics, farms, universities,
            research teams, NGOs, students and experienced professionals.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="#jobs">
              Find jobs
            </Link>
            <Link
              className="button button-secondary"
              href="/login?next=/dashboard"
            >
              Post a job
            </Link>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell role-grid">
          <article>
            <span className="module-tag">EMPLOYER / HR</span>
            <h2>Recruitment workspace</h2>
            <ul>
              <li>Create a verified company/employer profile</li>
              <li>Post jobs and internships by sector and city</li>
              <li>Define qualification, experience and skill requirements</li>
              <li>Search candidate profiles and CVs</li>
              <li>Shortlist and track applications</li>
            </ul>
            <Link
              href="/register?role=company#registration"
              className="button button-dark"
            >
              Register as employer
            </Link>
          </article>
          <article>
            <span className="module-tag">CANDIDATE</span>
            <h2>Professional career profile</h2>
            <ul>
              <li>Upload CV and create a structured profile</li>
              <li>Add education, PVMC information, experience and skills</li>
              <li>Select preferred sectors, roles and locations</li>
              <li>Discover matching jobs and internships</li>
              <li>Track saved jobs and applications</li>
            </ul>
            <Link
              href="/register?role=candidate#registration"
              className="button button-primary"
            >
              Create candidate profile
            </Link>
          </article>
        </div>
      </section>
      <section id="jobs" className="section section-soft">
        <div className="shell">
          <div className="directory-top">
            <div>
              <b>{visibleJobs.length} opportunities</b>
              <span>{showingSamples ? "Sample opportunities until approved jobs are published" : "Verified employer job board"}</span>
            </div>
            <form className="market-search" method="get">
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search role or company"
              />
              <select name="city" defaultValue={params.city ?? "All cities"}>
                <option>All cities</option>
                {cities.map((city) => <option key={city}>{city}</option>)}
              </select>
              <button className="button button-primary" type="submit">
                Search
              </button>
            </form>
          </div>
          {visibleJobs.length === 0 ? (
            <div className="empty-state">
              <h2>No jobs match this search.</h2>
              <Link href="/jobs#jobs">Clear search</Link>
            </div>
          ) : (
            <div className="job-board">
              {visibleJobs.map((job, index) => (
                <article key={job.slug}>
                  <div className="job-logo">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="job-main">
                    <span>{job.sector || "Animal health"}</span>
                    <h3>{job.title}</h3>
                    <p>
                      {job.company_name} • {job.city || "Pakistan"}
                    </p>
                    <div className="profile-chips">
                      <span>{job.employment_type}</span>
                      <span>Profile matching</span>
                    </div>
                  </div>
                  <div className="job-apply">
                    <small>Posted recently</small>
                    <Link
                      className="button button-primary"
                      href={job.is_sample ? "/coming-soon?feature=Job%20applications" : `/jobs/${job.slug}`}
                    >
                      View & apply
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">MATCHING LOGIC</span>
            <h2>Job matching should be structured, not just a notice board.</h2>
            <p>
              Candidate profiles, employer requirements and application tracking
              will share the same secure account system.
            </p>
          </div>
          <div className="feature-columns">
            <div>
              <h3>Profile data</h3>
              <p>
                Education, discipline, graduation year, PVMC status, experience,
                skills, certifications and CV.
              </p>
            </div>
            <div>
              <h3>Job data</h3>
              <p>
                Role, sector, location, employment type, education, experience,
                skills and deadline.
              </p>
            </div>
            <div>
              <h3>Matching</h3>
              <p>
                Rank opportunities using sector, qualification, skills, location
                and experience.
              </p>
            </div>
            <div>
              <h3>Career pipeline</h3>
              <p>
                Saved jobs, applications, shortlist status, interview stage and
                communication.
              </p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
