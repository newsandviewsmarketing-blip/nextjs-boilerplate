/* eslint-disable @next/next/no-img-element -- Approved Supabase Storage clinic media is displayed directly. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import ProfilePhoto from "../../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";
import { initials, sampleClinics, type PublicClinic } from "@/lib/directories";
import { requestClinicMembershipAction } from "../../dashboard/clinics/actions";

export const dynamic = "force-dynamic";

type ClinicService = {
  id: string;
  service_id: string;
  description: string | null;
  fee_min: number | null;
  fee_max: number | null;
  currency: string;
  duration_minutes: number | null;
  booking_enabled: boolean;
};

type ServiceCatalog = { id: string; service_name: string; category: string };

type ClinicPageData = {
  clinic: PublicClinic;
  services: Array<ClinicService & { service_name?: string; category?: string }>;
};

async function loadClinic(slug: string): Promise<ClinicPageData | null> {
  const sample = sampleClinics.find((item) => item.slug === slug);
  if (!isSupabaseConfigured()) return sample ? { clinic: sample, services: [] } : null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_clinics")
    .select("id, slug, clinic_name, facility_type, description, city, province, district, tehsil, logo_url, cover_image_url, address, public_phone, public_email, website, working_hours, emergency_service, services, species, profile_verified")
    .eq("slug", slug)
    .maybeSingle();
  const clinic = (data as PublicClinic | null) ?? sample ?? null;
  if (!clinic) return null;

  if (!clinic.id || clinic.is_sample) return { clinic, services: [] };

  const [{ data: serviceRows }, { data: catalogRows }] = await Promise.all([
    supabase
      .from("clinic_services")
      .select("id, service_id, description, fee_min, fee_max, currency, duration_minutes, booking_enabled")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .eq("is_public", true),
    supabase.from("service_catalog").select("id, service_name, category").eq("is_active", true),
  ]);

  const catalogMap = new Map(((catalogRows ?? []) as ServiceCatalog[]).map((row) => [row.id, row]));
  const services = ((serviceRows ?? []) as ClinicService[]).map((row) => ({
    ...row,
    service_name: catalogMap.get(row.service_id)?.service_name,
    category: catalogMap.get(row.service_id)?.category,
  }));

  return { clinic, services };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageData = await loadClinic(slug);
  const clinic = pageData?.clinic;
  if (!clinic) return { title: "Veterinary Clinic" };
  return {
    title: `${clinic.clinic_name} | Veterinary Clinic in ${clinic.city || "Pakistan"}`,
    description: clinic.description || `${clinic.clinic_name} veterinary facility profile on VetConnect Pakistan.`,
    alternates: { canonical: `/clinics/${slug}` },
    robots: clinic.is_sample ? { index: false, follow: true } : undefined,
  };
}

export default async function ClinicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { slug } = await params;
  const messages = await searchParams;
  const pageData = await loadClinic(slug);
  if (!pageData) notFound();
  const { clinic, services } = pageData;
  const identity = await getCurrentIdentity();
  const canClaim = Boolean(
    clinic.id &&
    !clinic.is_sample &&
    identity?.roles.some((role) => ["veterinarian", "professional"].includes(role)),
  );

  let membershipStatus: string | null = null;
  if (canClaim && identity && clinic.id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clinic_members")
      .select("membership_status")
      .eq("clinic_id", clinic.id)
      .eq("professional_user_id", identity.userId)
      .maybeSingle();
    membershipStatus = data?.membership_status ?? null;
  }

  return (
    <main>
      <SiteHeader />
      {clinic.cover_image_url && (
        <div className="clinic-public-cover">
          <img src={clinic.cover_image_url} alt={`${clinic.clinic_name} facility`} />
        </div>
      )}
      <section className="page-hero">
        <div className="shell company-profile-hero">
          <div className="company-mark company-profile-logo profile-photo-frame">
            <ProfilePhoto imageUrl={clinic.logo_url ?? null} name={clinic.clinic_name} fallback={initials(clinic.clinic_name)} />
          </div>
          <div>
            <span className="section-kicker">{clinic.is_sample ? "SAMPLE FACILITY" : "VETCONNECT VERIFIED FACILITY"}</span>
            <h1>{clinic.clinic_name}</h1>
            <p>{clinic.description || clinic.facility_type}</p>
            <div className="profile-chips">
              <span>{clinic.facility_type}</span>
              <span>{clinic.city || "Pakistan"}</span>
              {clinic.emergency_service && <span>Emergency service</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />
          <div className="company-contact-grid">
            <article><span>Location</span><b>{clinic.address || [clinic.city, clinic.tehsil, clinic.district, clinic.province].filter(Boolean).join(", ") || "Pakistan"}</b></article>
            <article><span>Public contact</span><b>{clinic.public_phone || clinic.public_email || "Contact details not published"}</b></article>
            <article><span>Working hours</span><b>{clinic.working_hours || "Not provided"}</b></article>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="shell feature-columns">
          <div>
            <h3>Services</h3>
            {services.length ? (
              <div className="workspace-record-list public-service-list">
                {services.map((service) => (
                  <article key={service.id}>
                    <div>
                      <h3>{service.service_name || "Veterinary service"}</h3>
                      {service.description && <p>{service.description}</p>}
                      <div className="status-cluster">
                        {service.fee_min !== null && <span className="status-pill">{service.currency} {service.fee_min}{service.fee_max !== null ? `–${service.fee_max}` : "+"}</span>}
                        {service.duration_minutes && <span className="status-pill">{service.duration_minutes} min</span>}
                        {service.booking_enabled && <span className="status-pill">booking enabled</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-chips">{clinic.services.map((item) => <span key={item}>{item}</span>)}</div>
            )}
          </div>
          <div><h3>Species served</h3><div className="profile-chips">{clinic.species.map((item) => <span key={item}>{item}</span>)}</div></div>
          <div><h3>Verification</h3><p>{clinic.profile_verified ? "Facility profile verified by VetConnect." : clinic.is_sample ? "This is a sample profile." : "Verification review is pending."}</p></div>
          <div><h3>Appointments</h3><p>Structured service records can mark booking availability. Appointment scheduling itself remains a separate module.</p></div>
        </div>
      </section>

      {canClaim && clinic.id && (
        <section className="section compact-section">
          <div className="shell two-col">
            <div>
              <span className="section-kicker">PROFESSIONAL AFFILIATION</span>
              <h2>Link this clinic to your professional profile.</h2>
              <p>Clinic affiliation does not replace PVMC or professional verification. The facility owner reviews the claim separately.</p>
            </div>
            <div className="backend-form-card">
              {membershipStatus ? (
                <div className="setup-notice"><p>Your clinic affiliation status is <strong>{membershipStatus}</strong>.</p></div>
              ) : (
                <form action={requestClinicMembershipAction}>
                  <input type="hidden" name="clinic_id" value={clinic.id} />
                  <input type="hidden" name="slug" value={clinic.slug} />
                  <label htmlFor="designation">Your designation at this clinic</label>
                  <input id="designation" name="designation" placeholder="Veterinarian, consultant, surgeon, medical director" />
                  <label className="checkbox-line"><input type="checkbox" name="is_public" /> Show this affiliation publicly after approval</label>
                  <FormSubmitButton pendingLabel="Submitting affiliation...">Request clinic affiliation</FormSubmitButton>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section compact-section">
        <div className="shell card-actions">
          <Link className="button button-primary" href="/coming-soon?feature=Clinic%20appointments">Request appointment</Link>
          <Link className="button button-secondary" href="/clinics">Back to facilities</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
