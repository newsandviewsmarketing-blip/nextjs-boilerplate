import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ProfilePhoto from "../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleProfessionals, type PublicProfessional } from "@/lib/directories";

export const metadata: Metadata = {
  title: "Veterinary & Animal Health Professionals",
  description: "Discover veterinary and allied animal-health professionals across Pakistan.",
  alternates: { canonical: "/professionals" },
};

export const dynamic = "force-dynamic";

async function loadProfessionals(): Promise<PublicProfessional[]> {
  if (!isSupabaseConfigured()) return sampleProfessionals;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_professionals")
    .select("user_id, slug, full_name, professional_type, headline, current_position, organization_name, city, province, years_experience, skills, profile_verified, image_url")
    .order("full_name");
  if (error || !data?.length) return sampleProfessionals;
  return data as PublicProfessional[];
}

export default async function ProfessionalsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; city?: string }> }) {
  const params = await searchParams;
  const professionals = await loadProfessionals();
  const q = (params.q ?? "").toLowerCase();
  const visible = professionals.filter((profile) => {
    const text = `${profile.full_name} ${profile.professional_type} ${profile.headline ?? ""} ${profile.current_position ?? ""} ${profile.organization_name ?? ""} ${profile.city ?? ""} ${profile.skills.join(" ")}`.toLowerCase();
    return (!q || text.includes(q)) && (!params.type || params.type === "All professional types" || profile.professional_type === params.type) && (!params.city || params.city === "All cities" || profile.city === params.city);
  });
  const types = [...new Set(professionals.map((item) => item.professional_type))];
  const cities = [...new Set(professionals.map((item) => item.city).filter(Boolean))] as string[];
  const showingSamples = professionals.some((item) => item.is_sample);

  return (
    <main>
      <SiteHeader />
      <section className="page-hero"><div className="shell">
        <span className="section-kicker">ANIMAL HEALTH & INDUSTRY PROFESSIONALS</span>
        <h1>Specialists across the wider animal-health sector.</h1>
        <p>Nutritionists, researchers, laboratory teams, academics, farm managers, regulatory professionals and other specialists are listed separately from the veterinarian directory.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/register?role=professional#registration">Create professional profile</Link></div>
      </div></section>
      <section className="section compact-section"><div className="shell">
        <div className="directory-top">
          <div><b>{visible.length} professional profiles</b><span>{showingSamples ? "Sample profiles until reviewed members are published" : "VetConnect-reviewed professional directory"}</span></div>
          <form className="market-search" method="get">
            <input name="q" defaultValue={params.q ?? ""} placeholder="Name, role, sector or skill" />
            <select name="type" defaultValue={params.type ?? "All professional types"}><option>All professional types</option>{types.map((item) => <option key={item}>{item}</option>)}</select>
            <select name="city" defaultValue={params.city ?? "All cities"}><option>All cities</option>{cities.map((item) => <option key={item}>{item}</option>)}</select>
            <button className="button button-primary" type="submit">Search</button>
          </form>
        </div>
        {visible.length === 0 ? <div className="empty-state"><h2>No professional matches these filters.</h2><Link href="/professionals">Clear search</Link></div> : (
          <div className="company-grid">{visible.map((profile) => <article key={profile.slug}>
            <div className="company-mark large profile-photo-frame">
              <ProfilePhoto imageUrl={profile.image_url} name={profile.full_name} fallback={initials(profile.full_name)} />
            </div>
            {profile.is_sample && <span className="sample-label">Sample profile</span>}
            <h3>{profile.full_name}</h3><p>{profile.professional_type} • {profile.city || "Pakistan"}</p>
            <div className="profile-chips">{profile.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>
            <dl><div><dt>Current role</dt><dd>{profile.current_position || "Not listed"}</dd></div><div><dt>Experience</dt><dd>{profile.years_experience} years</dd></div><div><dt>Status</dt><dd>{profile.profile_verified ? "Verified" : profile.is_sample ? "Sample" : "Pending"}</dd></div></dl>
            <Link className="button button-primary button-full" href={`/professionals/${profile.slug}`}>View profile</Link>
          </article>)}</div>
        )}
      </div></section>
      <section className="section section-soft"><div className="shell two-col"><div><span className="section-kicker">CLEAR PROFESSIONAL IDENTITY</span><h2>Veterinarian status is never assumed.</h2><p>This directory supports the wider animal-health workforce without describing non-veterinarians as veterinarians. Each profile displays its actual professional type and review status.</p></div><div className="spec-list"><div><b>Relevant sectors</b><span>Animal health, livestock, poultry, dairy, fisheries, feed, diagnostics, academia and research.</span></div><div><b>Career-ready profiles</b><span>Structured skills and experience can later support jobs and rule-based matching.</span></div><div><b>Privacy controls</b><span>Public summaries remain separate from private CVs, contact details and evidence.</span></div></div></div></section>
      <SiteFooter />
    </main>
  );
}
