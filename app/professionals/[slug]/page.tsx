import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ProfilePhoto from "../../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleProfessionals, type PublicProfessional } from "@/lib/directories";

export const dynamic = "force-dynamic";

type PublicEducation = {
  id: string;
  degree: string;
  institution: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

type PublicExperience = {
  id: string;
  organization_name: string;
  designation: string;
  responsibilities: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  organization_source: string;
};

type PublicCredential = {
  id: string;
  credential_type: string;
  issuing_authority: string | null;
  credential_number: string | null;
};

type ProfessionalPageData = {
  profile: PublicProfessional;
  education: PublicEducation[];
  experience: PublicExperience[];
  credentials: PublicCredential[];
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PK", {
    month: "short",
    year: "numeric",
  });
}

async function loadProfessional(slug: string): Promise<ProfessionalPageData | null> {
  const sample = sampleProfessionals.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) {
    return sample ? { profile: sample, education: [], experience: [], credentials: [] } : null;
  }

  const supabase = await createClient();
const select =
  "user_id, slug, full_name, professional_type, headline, current_position, organization_name, city, province, years_experience, skills, profile_verified, image_url, public_summary, district, tehsil";

const [accountResult, managedResult] = await Promise.all([
  supabase
    .from("public_professionals")
    .select(select)
    .eq("slug", slug)
    .maybeSingle(),

  supabase
    .from("public_managed_professionals")
    .select(select)
    .eq("slug", slug)
    .maybeSingle(),
]);

const accountProfile = accountResult.data as PublicProfessional | null;
const managedProfile = managedResult.data as PublicProfessional | null;

const profile = accountProfile ?? managedProfile ?? sample ?? null;
if (!profile) return null;

const isManagedProfile = !accountProfile && Boolean(managedProfile);

if (isManagedProfile || !profile.user_id || profile.is_sample) {
  return {
    profile,
    education: [],
    experience: [],
    credentials: [],
  };
}
  
  if (!profile.user_id || profile.is_sample) {
    return { profile, education: [], experience: [], credentials: [] };
  }

  const [educationResult, experienceResult, credentialResult] = await Promise.all([
    supabase
      .from("professional_education")
      .select("id, degree, institution, field_of_study, start_date, end_date, is_current")
      .eq("professional_user_id", profile.user_id)
      .eq("visibility", "public")
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
    supabase
      .from("professional_experience")
      .select("id, organization_name, designation, responsibilities, start_date, end_date, is_current, organization_source")
      .eq("professional_user_id", profile.user_id)
      .eq("visibility", "public")
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
    supabase
      .from("professional_credentials")
      .select("id, credential_type, issuing_authority, credential_number")
      .eq("professional_user_id", profile.user_id)
      .eq("visibility", "public")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile,
    education: (educationResult.data ?? []) as PublicEducation[],
    experience: (experienceResult.data ?? []) as PublicExperience[],
    credentials: (credentialResult.data ?? []) as PublicCredential[],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageData = await loadProfessional(slug);
  const profile = pageData?.profile;
  if (!profile) return { title: "Professional Profile" };
  return {
    title: `${profile.full_name} | ${profile.professional_type} in ${profile.city || "Pakistan"}`,
    description: profile.public_summary || profile.headline || `${profile.full_name} is listed on VetConnect Pakistan as ${profile.professional_type}.`,
    alternates: { canonical: `/professionals/${slug}` },
    robots: profile.is_sample ? { index: false, follow: true } : undefined,
  };
}

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pageData = await loadProfessional(slug);
  if (!pageData) notFound();
  const { profile, education, experience, credentials } = pageData;

  return (
    <main>
      <SiteHeader />
      <section className="page-hero professional-public-hero">
        <div className="shell company-profile-hero">
          <div className="company-mark company-profile-logo profile-photo-frame">
            <ProfilePhoto imageUrl={profile.image_url} name={profile.full_name} fallback={initials(profile.full_name)} />
          </div>
          <div>
            <span className="section-kicker">{profile.is_sample ? "SAMPLE PROFESSIONAL PROFILE" : "VETCONNECT PROFESSIONAL"}</span>
            <h1>{profile.full_name}</h1>
            <p>{profile.headline || profile.professional_type}</p>
            <div className="profile-chips">
              <span>{profile.professional_type}</span>
              <span>{profile.city || "Pakistan"}</span>
              <span>{profile.years_experience} years experience</span>
              {profile.profile_verified && <span>VetConnect verified</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell professional-public-layout">
          <aside className="professional-public-sidebar">
            <article>
              <span className="section-kicker">CURRENT ROLE</span>
              <h3>{profile.current_position || "Professional role not listed"}</h3>
              <p>{profile.organization_name || "Organization not listed"}</p>
            </article>
            <article>
              <span className="section-kicker">LOCATION</span>
             <p>
  {[
    ...new Set(
      [profile.city, profile.tehsil, profile.district, profile.province]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
    ),
  ].join(", ") || "Pakistan"}
</p>
            </article>
            <article>
              <span className="section-kicker">SKILLS</span>
              {profile.skills.length ? <div className="profile-chips">{profile.skills.map((item) => <span key={item}>{item}</span>)}</div> : <p>No public skills listed.</p>}
            </article>
          </aside>

          <div className="professional-public-main">
            <article className="professional-timeline-card">
              <span className="section-kicker">ABOUT</span>
              <h2>Professional summary</h2>
              <p>{profile.public_summary || profile.headline || "No public professional summary has been added yet."}</p>
            </article>

            <article className="professional-timeline-card">
              <span className="section-kicker">EXPERIENCE</span>
              <h2>Professional experience</h2>
              {experience.length === 0 ? <p>No public experience records.</p> : <div className="public-timeline-list">{experience.map((row) => <div key={row.id}><h3>{row.designation}</h3><p><b>{row.organization_name}</b></p><p>{formatDate(row.start_date)}{row.start_date ? " – " : ""}{row.is_current ? "Present" : formatDate(row.end_date)}</p>{row.responsibilities && <p>{row.responsibilities}</p>}{row.organization_source === "verified_membership" && <span className="status-pill status-approved">Verified organization link</span>}</div>)}</div>}
            </article>

            <article className="professional-timeline-card">
              <span className="section-kicker">EDUCATION</span>
              <h2>Education</h2>
              {education.length === 0 ? <p>No public education records.</p> : <div className="public-timeline-list">{education.map((row) => <div key={row.id}><h3>{row.degree}</h3><p><b>{row.institution || "Institution not listed"}</b></p>{row.field_of_study && <p>{row.field_of_study}</p>}<p>{formatDate(row.start_date)}{row.start_date ? " – " : ""}{row.is_current ? "Present" : formatDate(row.end_date)}</p></div>)}</div>}
            </article>

            <article className="professional-timeline-card">
              <span className="section-kicker">VERIFIED CREDENTIALS</span>
              <h2>Licences and credentials</h2>
              {credentials.length === 0 ? <p>No public verified credentials.</p> : <div className="public-timeline-list">{credentials.map((row) => <div key={row.id}><h3>{row.credential_type}</h3><p>{row.issuing_authority || "Issuing authority not listed"}</p>{row.credential_number && <p>Reference: {row.credential_number}</p>}<span className="status-pill status-approved">Verified</span></div>)}</div>}
            </article>

            <div className="card-actions">
              <Link className="button button-primary" href="/login?next=/dashboard">Connect through VetConnect</Link>
              <Link className="button button-secondary" href="/professionals">Back to directory</Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
