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

async function loadProfessional(slug: string): Promise<PublicProfessional | null> {
  const sample = sampleProfessionals.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_professionals").select("user_id, slug, full_name, professional_type, headline, current_position, organization_name, city, province, years_experience, skills, profile_verified, image_url").eq("slug", slug).maybeSingle();
  return (data as PublicProfessional | null) ?? sample ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfessional(slug);
  if (!profile) return { title: "Professional Profile" };
  return {
    title: `${profile.full_name} | ${profile.professional_type} in ${profile.city || "Pakistan"}`,
    description: profile.headline || `${profile.full_name} is listed on VetConnect Pakistan as ${profile.professional_type}.`,
    alternates: { canonical: `/professionals/${slug}` },
    robots: profile.is_sample ? { index: false, follow: true } : undefined,
  };
}

export default async function ProfessionalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await loadProfessional(slug);
  if (!profile) notFound();
  return <main><SiteHeader />
    <section className="page-hero"><div className="shell company-profile-hero"><div className="company-mark company-profile-logo profile-photo-frame"><ProfilePhoto imageUrl={profile.image_url} name={profile.full_name} fallback={initials(profile.full_name)} /></div><div><span className="section-kicker">{profile.is_sample ? "SAMPLE PROFESSIONAL PROFILE" : "VETCONNECT PROFESSIONAL"}</span><h1>{profile.full_name}</h1><p>{profile.headline || profile.professional_type}</p><div className="profile-chips"><span>{profile.professional_type}</span><span>{profile.city || "Pakistan"}</span><span>{profile.years_experience} years experience</span></div></div></div></section>
    <section className="section compact-section"><div className="shell"><div className="feature-columns">
      <div><h3>Professional identity</h3><p><strong>Type:</strong> {profile.professional_type}</p><p><strong>Status:</strong> {profile.profile_verified ? "Verified by VetConnect" : profile.is_sample ? "Sample profile" : "Review pending"}</p></div>
      <div><h3>Current work</h3><p><strong>Position:</strong> {profile.current_position || "Not listed"}</p><p><strong>Organization:</strong> {profile.organization_name || "Not listed"}</p></div>
      <div><h3>Location</h3><p>{[profile.city, profile.province].filter(Boolean).join(", ") || "Pakistan"}</p><p>Private contact information is shared only according to the profile owner&apos;s visibility settings.</p></div>
      <div><h3>Skills</h3>{profile.skills.length ? <div className="profile-chips">{profile.skills.map((item) => <span key={item}>{item}</span>)}</div> : <p>No public skills listed.</p>}</div>
    </div><div className="card-actions"><Link className="button button-primary" href="/login?next=/dashboard">Connect through VetConnect</Link><Link className="button button-secondary" href="/professionals">Back to directory</Link></div></div></section>
    <SiteFooter /></main>;
}
