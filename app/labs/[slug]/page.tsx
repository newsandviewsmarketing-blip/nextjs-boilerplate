import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleLaboratories, type PublicLaboratory } from "@/lib/directories";

export const dynamic = "force-dynamic";

async function loadLaboratory(slug: string): Promise<PublicLaboratory | null> { const sample = sampleLaboratories.find((item) => item.slug === slug); if (!isSupabaseConfigured()) return sample ?? null; const supabase = await createClient(); const { data } = await supabase.from("public_laboratories").select("id, slug, laboratory_name, laboratory_type, description, city, province, address, public_phone, public_email, website, working_hours, emergency_service, species_served, tests_offered, profile_verified, accreditation_verified").eq("slug", slug).maybeSingle(); return (data as PublicLaboratory | null) ?? sample ?? null; }

export default async function LaboratoryDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const lab = await loadLaboratory(slug); if (!lab) notFound(); return <main><SiteHeader />
  <section className="page-hero"><div className="shell company-profile-hero"><div className="company-mark company-profile-logo">{initials(lab.laboratory_name)}</div><div><span className="section-kicker">{lab.is_sample ? "SAMPLE LABORATORY" : "VETCONNECT VERIFIED LABORATORY"}</span><h1>{lab.laboratory_name}</h1><p>{lab.description || lab.laboratory_type}</p><div className="profile-chips"><span>{lab.laboratory_type}</span><span>{lab.city || "Pakistan"}</span>{lab.accreditation_verified && <span>Accreditation verified</span>}</div></div></div></section>
  <section className="section compact-section"><div className="shell company-contact-grid"><article><span>Location</span><b>{lab.address || [lab.city, lab.province].filter(Boolean).join(", ") || "Pakistan"}</b></article><article><span>Public contact</span><b>{lab.public_phone || lab.public_email || "Contact details not published"}</b></article><article><span>Working hours</span><b>{lab.working_hours || "Not provided"}</b></article></div></section>
  <section className="section section-soft"><div className="shell feature-columns"><div><h3>Tests offered</h3><div className="profile-chips">{lab.tests_offered.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Species served</h3><div className="profile-chips">{lab.species_served.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Profile verification</h3><p>{lab.profile_verified ? "Verified by VetConnect." : lab.is_sample ? "This is a sample profile." : "Verification review is pending."}</p></div><div><h3>Accreditation</h3><p>{lab.accreditation_verified ? "Supporting accreditation evidence has been reviewed." : "No verified accreditation claim is displayed."}</p></div></div></section>
  <section className="section compact-section"><div className="shell card-actions"><Link className="button button-primary" href="/login?next=/dashboard">Request test information</Link><Link className="button button-secondary" href="/labs">Back to laboratories</Link></div></section><SiteFooter /></main>; }
