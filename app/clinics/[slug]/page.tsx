import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleClinics, type PublicClinic } from "@/lib/directories";

export const dynamic = "force-dynamic";

async function loadClinic(slug: string): Promise<PublicClinic | null> {
  const sample = sampleClinics.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_clinics").select("id, slug, clinic_name, facility_type, description, city, province, address, public_phone, public_email, website, working_hours, emergency_service, services, species, profile_verified").eq("slug", slug).maybeSingle();
  return (data as PublicClinic | null) ?? sample ?? null;
}

export default async function ClinicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const clinic = await loadClinic(slug); if (!clinic) notFound();
  return <main><SiteHeader /><section className="page-hero"><div className="shell company-profile-hero"><div className="company-mark company-profile-logo">{initials(clinic.clinic_name)}</div><div><span className="section-kicker">{clinic.is_sample ? "SAMPLE FACILITY" : "VETCONNECT VERIFIED FACILITY"}</span><h1>{clinic.clinic_name}</h1><p>{clinic.description || clinic.facility_type}</p><div className="profile-chips"><span>{clinic.facility_type}</span><span>{clinic.city || "Pakistan"}</span>{clinic.emergency_service && <span>Emergency service</span>}</div></div></div></section>
    <section className="section compact-section"><div className="shell company-contact-grid"><article><span>Location</span><b>{clinic.address || [clinic.city, clinic.province].filter(Boolean).join(", ") || "Pakistan"}</b></article><article><span>Public contact</span><b>{clinic.public_phone || clinic.public_email || "Contact details not published"}</b></article><article><span>Working hours</span><b>{clinic.working_hours || "Not provided"}</b></article></div></section>
    <section className="section section-soft"><div className="shell feature-columns"><div><h3>Services</h3><div className="profile-chips">{clinic.services.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Species served</h3><div className="profile-chips">{clinic.species.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Verification</h3><p>{clinic.profile_verified ? "Facility profile verified by VetConnect." : clinic.is_sample ? "This is a sample profile." : "Verification review is pending."}</p></div><div><h3>Appointments</h3><p>Booking availability is shown only when the facility activates its schedule.</p></div></div></section>
    <section className="section compact-section"><div className="shell card-actions"><Link className="button button-primary" href="/coming-soon?feature=Clinic%20appointments">Request appointment</Link><Link className="button button-secondary" href="/clinics">Back to facilities</Link></div></section><SiteFooter /></main>;
}
