import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleClinics, type PublicClinic } from "@/lib/directories";

export const dynamic = "force-dynamic";

async function loadClinics(): Promise<PublicClinic[]> {
  if (!isSupabaseConfigured()) return sampleClinics;
  const supabase = await createClient();
  const { data, error } = await supabase.from("public_clinics").select("id, slug, clinic_name, facility_type, description, city, province, address, public_phone, public_email, website, working_hours, emergency_service, services, species, profile_verified").order("clinic_name");
  if (error || !data?.length) return sampleClinics;
  return data as PublicClinic[];
}

export default async function ClinicsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; type?: string }> }) {
  const params = await searchParams;
  const clinics = await loadClinics();
  const q = (params.q ?? "").toLowerCase();
  const visible = clinics.filter((clinic) => {
    const text = `${clinic.clinic_name} ${clinic.facility_type} ${clinic.city ?? ""} ${clinic.services.join(" ")} ${clinic.species.join(" ")}`.toLowerCase();
    return (!q || text.includes(q)) && (!params.city || params.city === "All cities" || clinic.city === params.city) && (!params.type || params.type === "All facility types" || clinic.facility_type === params.type);
  });
  const cities = [...new Set(clinics.map((item) => item.city).filter(Boolean))] as string[];
  const types = [...new Set(clinics.map((item) => item.facility_type))];
  const showingSamples = clinics.some((item) => item.is_sample);

  return <main><SiteHeader />
    <section className="page-hero"><div className="shell"><span className="section-kicker">CLINICS & HOSPITALS</span><h1>Find veterinary facilities by location and service.</h1><p>Search public, administrator-approved clinic and hospital profiles without exposing private verification documents.</p><div className="hero-actions"><Link className="button button-primary" href="/register?role=veterinarian#registration">Register a veterinary facility</Link></div></div></section>
    <section className="section compact-section"><div className="shell"><div className="directory-top"><div><b>{visible.length} facility profiles</b><span>{showingSamples ? "Sample profiles until facilities are approved" : "Administrator-approved clinic directory"}</span></div><form className="market-search" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Clinic, service or species" /><select name="city" defaultValue={params.city ?? "All cities"}><option>All cities</option>{cities.map((item) => <option key={item}>{item}</option>)}</select><select name="type" defaultValue={params.type ?? "All facility types"}><option>All facility types</option>{types.map((item) => <option key={item}>{item}</option>)}</select><button className="button button-primary" type="submit">Search</button></form></div>
      {visible.length === 0 ? <div className="empty-state"><h2>No facility matches these filters.</h2><Link href="/clinics">Clear search</Link></div> : <div className="company-grid">{visible.map((clinic) => <article key={clinic.slug}><div className="company-mark large">{initials(clinic.clinic_name)}</div>{clinic.is_sample && <span className="sample-label">Sample facility</span>}<h3>{clinic.clinic_name}</h3><p>{clinic.facility_type} • {clinic.city || "Pakistan"}</p><div className="profile-chips">{clinic.species.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div><dl><div><dt>Services</dt><dd>{clinic.services.slice(0, 2).join(", ") || "Not listed"}</dd></div><div><dt>Emergency</dt><dd>{clinic.emergency_service ? "Available" : "Not listed"}</dd></div><div><dt>Status</dt><dd>{clinic.profile_verified ? "Verified" : clinic.is_sample ? "Sample" : "Pending"}</dd></div></dl><Link className="button button-primary button-full" href={`/clinics/${clinic.slug}`}>View facility</Link></article>)}</div>}
    </div></section>
    <section className="section section-soft"><div className="shell two-col"><div><span className="section-kicker">FACILITY INFORMATION</span><h2>Public details controlled by the facility.</h2><p>Approved profiles can show services, species, working hours, service location and public contacts. Verification evidence and internal review notes remain private.</p></div><div className="spec-list"><div><b>Clinic or hospital</b><span>Facility type is stated clearly on every profile.</span></div><div><b>Veterinary leadership</b><span>Veterinarian credentials can be linked and verified separately.</span></div><div><b>Contact control</b><span>Only designated public phone, email and address fields are displayed.</span></div></div></div></section>
    <SiteFooter /></main>;
}
