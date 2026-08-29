/* eslint-disable @next/next/no-img-element -- Approved Supabase Storage URLs are displayed directly. */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import PakistanLocationFields from "../../../components/PakistanLocationFields";
import ProfilePhoto from "../../../components/ProfilePhoto";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/directories";
import {
  addClinicServiceAction,
  removeClinicServiceAction,
  updateClinicAction,
  uploadClinicMediaAction,
} from "../actions";

export const dynamic = "force-dynamic";

type ClinicRow = {
  id: string;
  slug: string;
  clinic_name: string;
  facility_type: string;
  description: string | null;
  province: string | null;
  district: string | null;
  tehsil: string | null;
  city: string | null;
  address: string | null;
  public_phone: string | null;
  public_email: string | null;
  website: string | null;
  working_hours: string | null;
  emergency_service: boolean;
  services: string[];
  species: string[];
  verification_status: string;
  rejection_reason: string | null;
  is_published: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
};

type ServiceCatalogRow = {
  id: string;
  service_name: string;
  category: string;
};

type ClinicServiceRow = {
  id: string;
  service_id: string;
  description: string | null;
  fee_min: number | null;
  fee_max: number | null;
  currency: string;
  duration_minutes: number | null;
  is_public: boolean;
  is_active: boolean;
  booking_enabled: boolean;
};

type MemberRow = {
  professional_user_id: string;
  designation: string | null;
  membership_status: string;
  claim_source: string;
  is_public: boolean;
  is_primary: boolean;
};

export default async function ClinicManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(`/dashboard/clinics/${id}`)}`);

  const supabase = await createClient();
  const [clinicResult, catalogResult, servicesResult, membersResult] = await Promise.all([
    supabase.from("clinics").select("id, slug, clinic_name, facility_type, description, province, district, tehsil, city, address, public_phone, public_email, website, working_hours, emergency_service, services, species, verification_status, rejection_reason, is_published, logo_url, cover_image_url").eq("id", id).eq("owner_id", identity.userId).maybeSingle(),
    supabase.from("service_catalog").select("id, service_name, category").eq("is_active", true).order("sort_order"),
    supabase.from("clinic_services").select("id, service_id, description, fee_min, fee_max, currency, duration_minutes, is_public, is_active, booking_enabled").eq("clinic_id", id).eq("is_active", true),
    supabase.from("clinic_members").select("professional_user_id, designation, membership_status, claim_source, is_public, is_primary").eq("clinic_id", id).order("created_at", { ascending: false }),
  ]);

  if (clinicResult.error || !clinicResult.data) notFound();
  const clinic = clinicResult.data as ClinicRow;
  const catalog = (catalogResult.data ?? []) as ServiceCatalogRow[];
  const clinicServices = (servicesResult.data ?? []) as ClinicServiceRow[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const catalogMap = new Map(catalog.map((item) => [item.id, item]));

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">CLINIC MANAGEMENT</span>
            <h1>{clinic.clinic_name}</h1>
            <p>{clinic.facility_type} · {[clinic.city, clinic.province].filter(Boolean).join(", ") || "Location pending"}</p>
          </div>
          <div className="dashboard-actions">
            {clinic.is_published && <Link className="button button-secondary" href={`/clinics/${clinic.slug}`}>View public profile</Link>}
            <Link className="button button-secondary" href="/dashboard/clinics">All clinics</Link>
            <Link className="button button-dark" href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />
          {(catalogResult.error || servicesResult.error || membersResult.error) && (
            <div className="form-message form-message-error">{catalogResult.error?.message || servicesResult.error?.message || membersResult.error?.message}</div>
          )}

          <div className="admin-summary">
            <article><b>{clinic.verification_status}</b><span>Verification status</span></article>
            <article><b>{clinic.is_published ? "Live" : "Hidden"}</b><span>Public directory</span></article>
            <article><b>{clinicServices.length}</b><span>Standardized services</span></article>
            <article><b>{members.filter((row) => row.membership_status === "active").length}</b><span>Active team links</span></article>
          </div>
          {clinic.rejection_reason && <div className="form-message form-message-error">Review note: {clinic.rejection_reason}</div>}

          <div className="clinic-media-layout workspace-heading-gap">
            <article className="professional-photo-card">
              <div className="professional-photo-large">
                <ProfilePhoto imageUrl={clinic.logo_url} name={clinic.clinic_name} fallback={initials(clinic.clinic_name)} />
              </div>
              <div><span className="section-kicker">FACILITY MEDIA</span><h2>Logo and cover image</h2><p>Images are stored in VetConnect&apos;s Supabase Storage profile-media bucket.</p></div>
            </article>
            {clinic.cover_image_url && <img className="clinic-cover-preview" src={clinic.cover_image_url} alt={`${clinic.clinic_name} cover`} />}
          </div>
          <div className="workspace-two-column">
            <form className="backend-form-card" action={uploadClinicMediaAction}>
              <input type="hidden" name="clinic_id" value={clinic.id} />
              <input type="hidden" name="media_type" value="logo" />
              <label htmlFor="clinic_logo">Clinic logo / profile image</label>
              <input id="clinic_logo" name="media" type="file" accept="image/jpeg,image/png,image/webp" required />
              <FormSubmitButton pendingLabel="Uploading logo...">Upload logo</FormSubmitButton>
            </form>
            <form className="backend-form-card" action={uploadClinicMediaAction}>
              <input type="hidden" name="clinic_id" value={clinic.id} />
              <input type="hidden" name="media_type" value="cover" />
              <label htmlFor="clinic_cover">Clinic cover image</label>
              <input id="clinic_cover" name="media" type="file" accept="image/jpeg,image/png,image/webp" required />
              <FormSubmitButton pendingLabel="Uploading cover...">Upload cover</FormSubmitButton>
            </form>
          </div>

          <form className="backend-form-card workspace-section-card workspace-heading-gap" action={updateClinicAction}>
            <input type="hidden" name="clinic_id" value={clinic.id} />
            <div className="section-heading"><span className="section-kicker">FACILITY PROFILE</span><h2>Public clinic information.</h2><p>Any substantive change will return an approved clinic to verification review, by design.</p></div>
            <div className="form-grid">
              <div><label htmlFor="clinic_name">Clinic / facility name</label><input id="clinic_name" name="clinic_name" defaultValue={clinic.clinic_name} required /></div>
              <div><label htmlFor="facility_type">Facility type</label><select id="facility_type" name="facility_type" defaultValue={clinic.facility_type}><option>Veterinary Clinic</option><option>Veterinary Hospital</option><option>Pet Clinic</option><option>Livestock Clinic</option><option>Farm Veterinary Service</option><option>Mobile Veterinary Service</option></select></div>
              <PakistanLocationFields defaultProvince={clinic.province ?? ""} defaultDistrict={clinic.district ?? ""} defaultTehsil={clinic.tehsil ?? ""} defaultCity={clinic.city ?? ""} />
              <div className="form-span-2"><label htmlFor="address">Address</label><input id="address" name="address" defaultValue={clinic.address ?? ""} /></div>
              <div><label htmlFor="public_phone">Public phone</label><input id="public_phone" name="public_phone" defaultValue={clinic.public_phone ?? ""} /></div>
              <div><label htmlFor="public_email">Public email</label><input id="public_email" name="public_email" type="email" defaultValue={clinic.public_email ?? ""} /></div>
              <div><label htmlFor="website">Website</label><input id="website" name="website" type="url" defaultValue={clinic.website ?? ""} /></div>
              <div><label htmlFor="working_hours">Working hours</label><input id="working_hours" name="working_hours" defaultValue={clinic.working_hours ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="services">Legacy service summary</label><input id="services" name="services" defaultValue={clinic.services.join(", ")} /><p className="form-help">Use the standardized service catalogue below for structured listings.</p></div>
              <div className="form-span-2"><label htmlFor="species">Species served</label><input id="species" name="species" defaultValue={clinic.species.join(", ")} /></div>
              <div className="form-span-2"><label htmlFor="description">Facility description</label><textarea id="description" name="description" defaultValue={clinic.description ?? ""} /></div>
              <label className="checkbox-line"><input type="checkbox" name="emergency_service" defaultChecked={clinic.emergency_service} /> Emergency service available</label>
            </div>
            <FormSubmitButton pendingLabel="Saving clinic...">Save clinic profile</FormSubmitButton>
          </form>

          <div className="workspace-two-column workspace-heading-gap">
            <section className="backend-form-card workspace-section-card">
              <div className="section-heading"><span className="section-kicker">SERVICES</span><h2>Standardized service catalogue.</h2></div>
              <div className="workspace-record-list">
                {clinicServices.length === 0 ? <p>No standardized services selected.</p> : clinicServices.map((row) => {
                  const service = catalogMap.get(row.service_id);
                  return <article key={row.id}><div><h3>{service?.service_name || "Clinic service"}</h3><p>{service?.category.replaceAll("_", " ") || "service"}</p>{row.description && <p>{row.description}</p>}<div className="status-cluster">{row.fee_min !== null && <span className="status-pill">PKR {row.fee_min}{row.fee_max !== null ? `–${row.fee_max}` : "+"}</span>}{row.duration_minutes && <span className="status-pill">{row.duration_minutes} min</span>}<span className="status-pill">{row.is_public ? "public" : "private"}</span>{row.booking_enabled && <span className="status-pill">booking enabled</span>}</div></div><form action={removeClinicServiceAction}><input type="hidden" name="clinic_id" value={clinic.id} /><input type="hidden" name="id" value={row.id} /><button className="button button-secondary" type="submit">Remove</button></form></article>;
                })}
              </div>
              <form className="workspace-inline-form" action={addClinicServiceAction}>
                <input type="hidden" name="clinic_id" value={clinic.id} />
                <h3>Add or update service</h3>
                <label>Service<select name="service_id" required defaultValue=""><option value="">Select service</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.service_name}</option>)}</select></label>
                <label>Description<textarea name="description" /></label>
                <div className="form-grid"><label>Minimum fee (PKR)<input name="fee_min" type="number" min="0" step="0.01" /></label><label>Maximum fee (PKR)<input name="fee_max" type="number" min="0" step="0.01" /></label></div>
                <label>Typical duration (minutes)<input name="duration_minutes" type="number" min="1" /></label>
                <label className="checkbox-line"><input name="is_public" type="checkbox" defaultChecked /> Show publicly</label>
                <label className="checkbox-line"><input name="booking_enabled" type="checkbox" /> Booking can be enabled for this service</label>
                <FormSubmitButton pendingLabel="Saving service...">Save service</FormSubmitButton>
              </form>
            </section>

            <section className="backend-form-card workspace-section-card">
              <div className="section-heading"><span className="section-kicker">TEAM</span><h2>Professional affiliations.</h2><p>Clinic ownership and professional verification remain separate records.</p></div>
              <div className="workspace-record-list">
                {members.length === 0 ? <p>No team affiliation records yet. Professionals can request affiliation from the public clinic page.</p> : members.map((row) => <article key={row.professional_user_id}><div><h3>{row.designation || "Professional affiliation"}</h3><p>Professional ID: {row.professional_user_id}</p><div className="status-cluster"><span className={`status-pill status-${row.membership_status}`}>{row.membership_status}</span><span className="status-pill">{row.claim_source.replaceAll("_", " ")}</span>{row.is_primary && <span className="status-pill">primary</span>}{row.is_public && <span className="status-pill">public</span>}</div></div></article>)}
              </div>
              <div className="setup-notice"><p>Claim review, invitations and primary-team controls are already supported by the database foundation. A name-based invitation UI will be added after the professional directory selector is connected.</p></div>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
