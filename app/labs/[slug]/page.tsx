import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { PublicContactLinks } from "../../components/ExternalLinks";
import { requestLaboratoryInformationAction } from "../actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleLaboratories, type PublicLaboratory } from "@/lib/directories";

export const dynamic = "force-dynamic";

async function loadLaboratory(slug: string): Promise<PublicLaboratory | null> { const sample = sampleLaboratories.find((item) => item.slug === slug); if (!isSupabaseConfigured()) return sample ?? null; const supabase = await createClient(); const { data } = await supabase.from("public_laboratories").select("id, slug, laboratory_name, laboratory_type, description, city, province, district, tehsil, address, public_phone, public_email, website, google_maps_url, working_hours, emergency_service, species_served, tests_offered, profile_verified, accreditation_verified").eq("slug", slug).maybeSingle(); return (data as PublicLaboratory | null) ?? null; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lab = await loadLaboratory(slug);
  if (!lab) return { title: "Veterinary Diagnostic Laboratory" };
  return {
    title: `${lab.laboratory_name} | Veterinary Diagnostic Laboratory`,
    description: lab.description || `${lab.laboratory_name} diagnostic laboratory profile on VetConnect Pakistan.`,
    alternates: { canonical: `/labs/${slug}` },
    robots: lab.is_sample ? { index: false, follow: true } : undefined,
  };
}

export default async function LaboratoryDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; message?: string }> }) { const { slug } = await params; const messages = await searchParams; const lab = await loadLaboratory(slug); if (!lab) notFound(); return <main><SiteHeader />
  <section className="page-hero"><div className="shell company-profile-hero"><div className="company-mark company-profile-logo">{initials(lab.laboratory_name)}</div><div><span className="section-kicker">{lab.is_sample ? "SAMPLE LABORATORY" : "VETCONNECT VERIFIED LABORATORY"}</span><h1>{lab.laboratory_name}</h1><p>{lab.description || lab.laboratory_type}</p><div className="profile-chips"><span>{lab.laboratory_type}</span><span>{lab.city || "Pakistan"}</span>{lab.accreditation_verified && <span>Accreditation verified</span>}</div></div></div></section>
  <section className="section compact-section"><div className="shell"><FormMessage {...messages} /><div className="company-contact-grid"><article><span>Location</span><b>{lab.address || [lab.city, lab.province].filter(Boolean).join(", ") || "Pakistan"}</b>{lab.google_maps_url && <PublicContactLinks mapUrl={lab.google_maps_url} />}</article><article><span>Public contact</span>{lab.public_phone || lab.public_email || lab.website ? <PublicContactLinks phone={lab.public_phone} email={lab.public_email} website={lab.website} /> : <b>Contact details not published</b>}</article><article><span>Working hours</span><b>{lab.working_hours || "Not provided"}</b></article></div></div></section>
  <section className="section section-soft"><div className="shell feature-columns"><div><h3>Tests offered</h3><div className="profile-chips">{lab.tests_offered.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Species served</h3><div className="profile-chips">{lab.species_served.map((item) => <span key={item}>{item}</span>)}</div></div><div><h3>Profile verification</h3><p>{lab.profile_verified ? "Verified by VetConnect." : lab.is_sample ? "This is a sample profile." : "Verification review is pending."}</p></div><div><h3>Accreditation</h3><p>{lab.accreditation_verified ? "Supporting accreditation evidence has been reviewed." : "No verified accreditation claim is displayed."}</p></div></div></section>
  {lab.id && !lab.is_sample && <section className="section compact-section"><div className="shell two-col"><div><span className="section-kicker">TEST INFORMATION REQUEST</span><h2>Ask the laboratory about a test.</h2><p>Create a structured enquiry for test availability, sample requirements, turnaround time or quotation.</p></div><form className="backend-form-card" action={requestLaboratoryInformationAction}><input type="hidden" name="laboratory_id" value={lab.id}/><input type="hidden" name="slug" value={lab.slug}/><label>Your name</label><input name="contact_name" required/><label>Email</label><input name="contact_email" type="email"/><label>Phone</label><input name="contact_phone"/><label>Organization</label><input name="organization"/><label>Test requested</label><input name="test_requested" list="lab-test-options"/><datalist id="lab-test-options">{lab.tests_offered.map(item=><option key={item} value={item}/>)}</datalist><label>Sample type</label><input name="sample_type"/><label>Message</label><textarea name="message" rows={3} required/><FormSubmitButton pendingLabel="Sending request...">Send test information request</FormSubmitButton></form></div></section>}<section className="section compact-section"><div className="shell card-actions"><Link className="button button-secondary" href="/labs">Back to laboratories</Link></div></section><SiteFooter /></main>; }
