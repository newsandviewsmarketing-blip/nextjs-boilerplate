import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleLaboratories, type PublicLaboratory } from "@/lib/directories";

export const metadata: Metadata = {
  title: "Veterinary Diagnostic Laboratories in Pakistan",
  description: "Search veterinary and animal-health diagnostic laboratories in Pakistan by test, species and city.",
  alternates: { canonical: "/labs" },
};

export const dynamic = "force-dynamic";

async function loadLaboratories(): Promise<PublicLaboratory[]> {
  if (!isSupabaseConfigured()) return sampleLaboratories;
  const supabase = await createClient();
  const { data, error } = await supabase.from("public_laboratories").select("id, slug, laboratory_name, laboratory_type, description, city, province, district, tehsil, address, public_phone, public_email, website, google_maps_url, logo_url, cover_image_url, working_hours, emergency_service, species_served, tests_offered, profile_verified, accreditation_verified").order("laboratory_name");
  if (error) return [];
  return (data ?? []) as PublicLaboratory[];
}

export default async function LaboratoriesPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; test?: string }> }) {
  const params = await searchParams; const labs = await loadLaboratories(); const q = (params.q ?? "").toLowerCase(); const visible = labs.filter((lab) => { const text = `${lab.laboratory_name} ${lab.laboratory_type} ${lab.city ?? ""} ${lab.tests_offered.join(" ")} ${lab.species_served.join(" ")}`.toLowerCase(); return (!q || text.includes(q)) && (!params.city || params.city === "All cities" || lab.city === params.city) && (!params.test || params.test === "All tests" || lab.tests_offered.includes(params.test)); });
  const cities = [...new Set(labs.map((item) => item.city).filter(Boolean))] as string[]; const tests = [...new Set(labs.flatMap((item) => item.tests_offered))]; const showingSamples = labs.some((item) => item.is_sample);
  return <main><SiteHeader /><section className="page-hero"><div className="shell"><span className="section-kicker">DIAGNOSTIC LABORATORIES</span><h1>Search laboratories by test, species and location.</h1><p>Laboratory profile verification and accreditation verification are separate. VetConnect only displays an accreditation badge when supporting evidence has been reviewed.</p><div className="hero-actions"><Link className="button button-primary" href="/register?role=laboratory#registration">Register a laboratory</Link></div></div></section>
    <section className="section compact-section"><div className="shell"><div className="directory-top"><div><b>{visible.length} laboratory profiles</b><span>{showingSamples ? "Sample profiles until laboratories are approved" : "Administrator-approved laboratory directory"}</span></div><form className="market-search" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Laboratory, test or species" /><select name="city" defaultValue={params.city ?? "All cities"}><option>All cities</option>{cities.map((item) => <option key={item}>{item}</option>)}</select><select name="test" defaultValue={params.test ?? "All tests"}><option>All tests</option>{tests.map((item) => <option key={item}>{item}</option>)}</select><button className="button button-primary" type="submit">Search</button></form></div>
      {visible.length === 0 ? <div className="empty-state"><h2>No laboratory matches these filters.</h2><Link href="/labs">Clear search</Link></div> : <div className="company-grid">{visible.map((lab) => <article key={lab.slug}>{lab.logo_url ? <img className="company-mark large" src={lab.logo_url} alt={`${lab.laboratory_name} logo`} loading="lazy" decoding="async" /> : <div className="company-mark large">{initials(lab.laboratory_name)}</div>}{lab.is_sample && <span className="sample-label">Sample laboratory</span>}<h3>{lab.laboratory_name}</h3><p>{lab.laboratory_type} • {lab.city || "Pakistan"}</p><div className="profile-chips">{lab.tests_offered.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div><dl><div><dt>Species</dt><dd>{lab.species_served.slice(0, 3).join(", ") || "Not listed"}</dd></div><div><dt>Profile</dt><dd>{lab.profile_verified ? "Verified" : lab.is_sample ? "Sample" : "Pending"}</dd></div><div><dt>Accreditation</dt><dd>{lab.accreditation_verified ? "Verified" : "Not claimed"}</dd></div></dl><Link className="button button-primary button-full" href={`/labs/${lab.slug}`}>View laboratory</Link></article>)}</div>}
    </div></section><section className="section section-soft"><div className="shell two-col"><div><span className="section-kicker">LABORATORY TRUST</span><h2>Profile review is not accreditation.</h2><p>A VetConnect Verified Laboratory badge confirms that the submitted public profile has been reviewed. Any accreditation or licence badge requires its own evidence and authority record.</p></div><div className="spec-list"><div><b>Test menu</b><span>PCR, ELISA, microbiology, serology, feed, milk, water and other configured tests.</span></div><div><b>Locations</b><span>Head office, branches and sample collection centres can be listed separately.</span></div><div><b>Evidence protected</b><span>Certificates and internal verification notes remain in private records.</span></div></div></div></section><SiteFooter /></main>;
}
