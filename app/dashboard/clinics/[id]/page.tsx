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
  endClinicMemberAction,
  inviteClinicMemberAction,
  removeClinicServiceAction,
  reviewClinicMembershipAction,
  saveClinicAvailabilityAction,
  setClinicPrimaryMemberAction,
  updateClinicAction,
  updateClinicAppointmentAction,
  uploadClinicMediaAction,
} from "../actions";

export const dynamic = "force-dynamic";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

type ProfessionalOption = {
  user_id: string | null;
  slug: string;
  full_name: string;
  professional_type: string;
  current_position: string | null;
  city: string | null;
};

type AvailabilityRow = {
  day_of_week: number;
  is_open: boolean;
  is_24_hours: boolean;
  opens_at: string | null;
  closes_at: string | null;
  break_start: string | null;
  break_end: string | null;
  appointment_enabled: boolean;
  slot_minutes: number;
};

type AppointmentRow = {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  animal_species: string | null;
  service_id: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reason: string;
  owner_note: string | null;
  status: string;
  created_at: string;
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
  if (!identity) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/clinics/${id}`)}`,
    );
  }

  const supabase = await createClient();
  const [
    clinicResult,
    catalogResult,
    servicesResult,
    membersResult,
    availabilityResult,
    appointmentsResult,
    professionalsResult,
  ] = await Promise.all([
    supabase
      .from("clinics")
      .select(
        "id, slug, clinic_name, facility_type, description, province, district, tehsil, city, address, public_phone, public_email, website, working_hours, emergency_service, services, species, verification_status, rejection_reason, is_published, logo_url, cover_image_url",
      )
      .eq("id", id)
      .eq("owner_id", identity.userId)
      .maybeSingle(),
    supabase
      .from("service_catalog")
      .select("id, service_name, category")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("clinic_services")
      .select(
        "id, service_id, description, fee_min, fee_max, currency, duration_minutes, is_public, is_active, booking_enabled",
      )
      .eq("clinic_id", id)
      .eq("is_active", true),
    supabase
      .from("clinic_members")
      .select(
        "professional_user_id, designation, membership_status, claim_source, is_public, is_primary",
      )
      .eq("clinic_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("clinic_availability")
      .select(
        "day_of_week, is_open, is_24_hours, opens_at, closes_at, break_start, break_end, appointment_enabled, slot_minutes",
      )
      .eq("clinic_id", id)
      .order("day_of_week"),
    supabase
      .from("clinic_appointment_requests")
      .select(
        "id, contact_name, contact_email, contact_phone, animal_species, service_id, preferred_date, preferred_time, scheduled_date, scheduled_time, reason, owner_note, status, created_at",
      )
      .eq("clinic_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("public_professionals")
      .select(
        "user_id, slug, full_name, professional_type, current_position, city",
      )
      .order("full_name"),
  ]);

  if (clinicResult.error || !clinicResult.data) notFound();

  const clinic = clinicResult.data as ClinicRow;
  const catalog = (catalogResult.data ?? []) as ServiceCatalogRow[];
  const clinicServices =
    (servicesResult.data ?? []) as ClinicServiceRow[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const availability =
    (availabilityResult.data ?? []) as AvailabilityRow[];
  const appointments =
    (appointmentsResult.data ?? []) as AppointmentRow[];
  const professionals = (
    (professionalsResult.data ?? []) as ProfessionalOption[]
  ).filter((row) => Boolean(row.user_id));

  const catalogMap = new Map(
    catalog.map((item) => [item.id, item]),
  );
  const availabilityMap = new Map(
    availability.map((row) => [row.day_of_week, row]),
  );
  const professionalMap = new Map(
    professionals
      .filter((row) => row.user_id)
      .map((row) => [row.user_id as string, row]),
  );
  const memberIds = new Set(
    members.map((row) => row.professional_user_id),
  );
  const invitationCandidates = professionals.filter(
    (row) => row.user_id && !memberIds.has(row.user_id),
  );
  const activeMembers = members.filter(
    (row) => row.membership_status === "active",
  );
  const primaryMember = activeMembers.find(
    (row) => row.is_primary,
  );

  const loadingErrors = [
    catalogResult.error,
    servicesResult.error,
    membersResult.error,
    availabilityResult.error,
    appointmentsResult.error,
    professionalsResult.error,
  ].filter(Boolean);

  return (
    <main>
      <SiteHeader />

      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">
              CLINIC MANAGEMENT
            </span>
            <h1>{clinic.clinic_name}</h1>
            <p>
              {clinic.facility_type} ·{" "}
              {[clinic.city, clinic.province]
                .filter(Boolean)
                .join(", ") || "Location pending"}
            </p>
          </div>

          <div className="dashboard-actions">
            {clinic.is_published && (
              <Link
                className="button button-secondary"
                href={`/clinics/${clinic.slug}`}
              >
                View public profile
              </Link>
            )}
            <Link
              className="button button-secondary"
              href="/dashboard/clinics"
            >
              All clinics
            </Link>
            <Link
              className="button button-dark"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />

          {loadingErrors.length > 0 && (
            <div className="form-message form-message-error">
              {loadingErrors[0]?.message}
            </div>
          )}

          <div className="admin-summary">
            <article>
              <b>{clinic.verification_status}</b>
              <span>Verification status</span>
            </article>
            <article>
              <b>{clinic.is_published ? "Live" : "Hidden"}</b>
              <span>Public directory</span>
            </article>
            <article>
              <b>{clinicServices.length}</b>
              <span>Standardized services</span>
            </article>
            <article>
              <b>{activeMembers.length}</b>
              <span>Active team links</span>
            </article>
            <article>
              <b>{appointments.filter((row) => row.status === "new").length}</b>
              <span>New appointments</span>
            </article>
          </div>

          {clinic.rejection_reason && (
            <div className="form-message form-message-error">
              Review note: {clinic.rejection_reason}
            </div>
          )}

          <div className="clinic-media-layout workspace-heading-gap">
            <article className="professional-photo-card">
              <div className="professional-photo-large">
                <ProfilePhoto
                  imageUrl={clinic.logo_url}
                  name={clinic.clinic_name}
                  fallback={initials(clinic.clinic_name)}
                />
              </div>
              <div>
                <span className="section-kicker">
                  FACILITY MEDIA
                </span>
                <h2>Logo and cover image</h2>
                <p>
                  Images are stored in VetConnect&apos;s Supabase
                  Storage profile-media bucket.
                </p>
              </div>
            </article>

            {clinic.cover_image_url && (
              <img
                className="clinic-cover-preview"
                src={clinic.cover_image_url}
                alt={`${clinic.clinic_name} cover`}
              />
            )}
          </div>

          <div className="workspace-two-column">
            <form
              className="backend-form-card"
              action={uploadClinicMediaAction}
            >
              <input
                type="hidden"
                name="clinic_id"
                value={clinic.id}
              />
              <input
                type="hidden"
                name="media_type"
                value="logo"
              />
              <label htmlFor="clinic_logo">
                Clinic logo / profile image
              </label>
              <input
                id="clinic_logo"
                name="media"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <FormSubmitButton pendingLabel="Uploading logo...">
                Upload logo
              </FormSubmitButton>
            </form>

            <form
              className="backend-form-card"
              action={uploadClinicMediaAction}
            >
              <input
                type="hidden"
                name="clinic_id"
                value={clinic.id}
              />
              <input
                type="hidden"
                name="media_type"
                value="cover"
              />
              <label htmlFor="clinic_cover">
                Clinic cover image
              </label>
              <input
                id="clinic_cover"
                name="media"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <FormSubmitButton pendingLabel="Uploading cover...">
                Upload cover
              </FormSubmitButton>
            </form>
          </div>

          <form
            className="backend-form-card workspace-section-card workspace-heading-gap"
            action={updateClinicAction}
          >
            <input
              type="hidden"
              name="clinic_id"
              value={clinic.id}
            />

            <div className="section-heading">
              <span className="section-kicker">
                FACILITY PROFILE
              </span>
              <h2>Public clinic information.</h2>
              <p>
                Any substantive change will return an approved
                clinic to verification review, by design.
              </p>
            </div>

            <div className="form-grid">
              <div>
                <label htmlFor="clinic_name">
                  Clinic / facility name
                </label>
                <input
                  id="clinic_name"
                  name="clinic_name"
                  defaultValue={clinic.clinic_name}
                  required
                />
              </div>

              <div>
                <label htmlFor="facility_type">
                  Facility type
                </label>
                <select
                  id="facility_type"
                  name="facility_type"
                  defaultValue={clinic.facility_type}
                >
                  <option>Veterinary Clinic</option>
                  <option>Veterinary Hospital</option>
                  <option>Pet Clinic</option>
                  <option>Livestock Clinic</option>
                  <option>Farm Veterinary Service</option>
                  <option>Mobile Veterinary Service</option>
                </select>
              </div>

              <PakistanLocationFields
                defaultProvince={clinic.province ?? ""}
                defaultDistrict={clinic.district ?? ""}
                defaultTehsil={clinic.tehsil ?? ""}
                defaultCity={clinic.city ?? ""}
              />

              <div className="form-span-2">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  defaultValue={clinic.address ?? ""}
                />
              </div>

              <div>
                <label htmlFor="public_phone">
                  Public phone
                </label>
                <input
                  id="public_phone"
                  name="public_phone"
                  defaultValue={clinic.public_phone ?? ""}
                />
              </div>

              <div>
                <label htmlFor="public_email">
                  Public email
                </label>
                <input
                  id="public_email"
                  name="public_email"
                  type="email"
                  defaultValue={clinic.public_email ?? ""}
                />
              </div>

              <div>
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={clinic.website ?? ""}
                />
              </div>

              <div>
                <label>Published hours summary</label>
                <input
                  value={clinic.working_hours ?? "Set weekly hours below"}
                  readOnly
                />
                <p className="form-help">
                  This summary is generated automatically from the
                  weekly availability section.
                </p>
              </div>

              <div className="form-span-2">
                <label htmlFor="services">
                  Legacy service summary
                </label>
                <input
                  id="services"
                  name="services"
                  defaultValue={clinic.services.join(", ")}
                />
                <p className="form-help">
                  Use the standardized service catalogue below for
                  structured listings.
                </p>
              </div>

              <div className="form-span-2">
                <label htmlFor="species">
                  Species served
                </label>
                <input
                  id="species"
                  name="species"
                  defaultValue={clinic.species.join(", ")}
                />
              </div>

              <div className="form-span-2">
                <label htmlFor="description">
                  Facility description
                </label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={clinic.description ?? ""}
                />
              </div>

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  name="emergency_service"
                  defaultChecked={clinic.emergency_service}
                />{" "}
                Emergency service available
              </label>
            </div>

            <FormSubmitButton pendingLabel="Saving clinic...">
              Save clinic profile
            </FormSubmitButton>
          </form>

          <form
            className="backend-form-card workspace-section-card workspace-heading-gap"
            action={saveClinicAvailabilityAction}
          >
            <input
              type="hidden"
              name="clinic_id"
              value={clinic.id}
            />

            <div className="section-heading">
              <span className="section-kicker">
                HOURS & AVAILABILITY
              </span>
              <h2>Weekly clinic schedule and appointment slots.</h2>
              <p>
                Set opening hours, optional breaks, 24-hour service
                and whether appointment requests are accepted on
                each day. The public clinic page uses this schedule.
              </p>
            </div>

            <div className="workspace-record-list">
              {dayNames.map((dayName, dayOfWeek) => {
                const row = availabilityMap.get(dayOfWeek);
                return (
                  <article key={dayName}>
                    <div>
                      <h3>{dayName}</h3>
                      <div className="form-grid">
                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            name={`day_${dayOfWeek}_open`}
                            defaultChecked={row?.is_open ?? false}
                          />{" "}
                          Clinic open
                        </label>

                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            name={`day_${dayOfWeek}_24h`}
                            defaultChecked={
                              row?.is_24_hours ?? false
                            }
                          />{" "}
                          24 hours
                        </label>

                        <label>
                          Opens
                          <input
                            type="time"
                            name={`day_${dayOfWeek}_opens`}
                            defaultValue={
                              row?.opens_at?.slice(0, 5) ?? "09:00"
                            }
                          />
                        </label>

                        <label>
                          Closes
                          <input
                            type="time"
                            name={`day_${dayOfWeek}_closes`}
                            defaultValue={
                              row?.closes_at?.slice(0, 5) ?? "17:00"
                            }
                          />
                        </label>

                        <label>
                          Break starts
                          <input
                            type="time"
                            name={`day_${dayOfWeek}_break_start`}
                            defaultValue={
                              row?.break_start?.slice(0, 5) ?? ""
                            }
                          />
                        </label>

                        <label>
                          Break ends
                          <input
                            type="time"
                            name={`day_${dayOfWeek}_break_end`}
                            defaultValue={
                              row?.break_end?.slice(0, 5) ?? ""
                            }
                          />
                        </label>

                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            name={`day_${dayOfWeek}_appointments`}
                            defaultChecked={
                              row?.appointment_enabled ?? false
                            }
                          />{" "}
                          Accept appointment requests
                        </label>

                        <label>
                          Slot length (minutes)
                          <input
                            type="number"
                            min="5"
                            max="240"
                            step="5"
                            name={`day_${dayOfWeek}_slot`}
                            defaultValue={row?.slot_minutes ?? 30}
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <FormSubmitButton pendingLabel="Saving weekly hours...">
              Save weekly availability
            </FormSubmitButton>
          </form>

          <div className="workspace-two-column workspace-heading-gap">
            <section className="backend-form-card workspace-section-card">
              <div className="section-heading">
                <span className="section-kicker">SERVICES</span>
                <h2>Standardized service catalogue.</h2>
              </div>

              <div className="workspace-record-list">
                {clinicServices.length === 0 ? (
                  <p>No standardized services selected.</p>
                ) : (
                  clinicServices.map((row) => {
                    const service = catalogMap.get(row.service_id);
                    return (
                      <article key={row.id}>
                        <div>
                          <h3>
                            {service?.service_name ||
                              "Clinic service"}
                          </h3>
                          <p>
                            {service?.category.replaceAll(
                              "_",
                              " ",
                            ) || "service"}
                          </p>
                          {row.description && (
                            <p>{row.description}</p>
                          )}
                          <div className="status-cluster">
                            {row.fee_min !== null && (
                              <span className="status-pill">
                                PKR {row.fee_min}
                                {row.fee_max !== null
                                  ? `–${row.fee_max}`
                                  : "+"}
                              </span>
                            )}
                            {row.duration_minutes && (
                              <span className="status-pill">
                                {row.duration_minutes} min
                              </span>
                            )}
                            <span className="status-pill">
                              {row.is_public
                                ? "public"
                                : "private"}
                            </span>
                            {row.booking_enabled && (
                              <span className="status-pill">
                                booking enabled
                              </span>
                            )}
                          </div>
                        </div>

                        <form
                          action={removeClinicServiceAction}
                        >
                          <input
                            type="hidden"
                            name="clinic_id"
                            value={clinic.id}
                          />
                          <input
                            type="hidden"
                            name="id"
                            value={row.id}
                          />
                          <button
                            className="button button-secondary"
                            type="submit"
                          >
                            Remove
                          </button>
                        </form>
                      </article>
                    );
                  })
                )}
              </div>

              <form
                className="workspace-inline-form"
                action={addClinicServiceAction}
              >
                <input
                  type="hidden"
                  name="clinic_id"
                  value={clinic.id}
                />
                <h3>Add or update service</h3>

                <label>
                  Service
                  <select
                    name="service_id"
                    required
                    defaultValue=""
                  >
                    <option value="">Select service</option>
                    {catalog.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.service_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Description
                  <textarea name="description" />
                </label>

                <div className="form-grid">
                  <label>
                    Minimum fee (PKR)
                    <input
                      name="fee_min"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </label>
                  <label>
                    Maximum fee (PKR)
                    <input
                      name="fee_max"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </label>
                </div>

                <label>
                  Typical duration (minutes)
                  <input
                    name="duration_minutes"
                    type="number"
                    min="1"
                  />
                </label>

                <label className="checkbox-line">
                  <input
                    name="is_public"
                    type="checkbox"
                    defaultChecked
                  />{" "}
                  Show publicly
                </label>

                <label className="checkbox-line">
                  <input
                    name="booking_enabled"
                    type="checkbox"
                  />{" "}
                  Booking can be enabled for this service
                </label>

                <FormSubmitButton pendingLabel="Saving service...">
                  Save service
                </FormSubmitButton>
              </form>
            </section>

            <section className="backend-form-card workspace-section-card">
              <div className="section-heading">
                <span className="section-kicker">
                  TEAM HIERARCHY
                </span>
                <h2>Owner, primary professional and clinic team.</h2>
                <p>
                  Clinic ownership remains separate from
                  professional and PVMC verification. A clinic may
                  designate one active public professional as its
                  primary clinical contact.
                </p>
              </div>

              <div className="setup-notice">
                <p>
                  <strong>Owner:</strong> clinic account holder
                  &nbsp; → &nbsp;
                  <strong>Primary professional:</strong>{" "}
                  {primaryMember
                    ? professionalMap.get(
                        primaryMember.professional_user_id,
                      )?.full_name ||
                      primaryMember.designation ||
                      primaryMember.professional_user_id
                    : "Not assigned"}
                  &nbsp; → &nbsp;
                  <strong>Team:</strong> {activeMembers.length}{" "}
                  active affiliation
                  {activeMembers.length === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="workspace-record-list">
                {members.length === 0 ? (
                  <p>No team affiliation records yet.</p>
                ) : (
                  members.map((row) => {
                    const professional =
                      professionalMap.get(
                        row.professional_user_id,
                      );
                    const isPendingSelfClaim =
                      row.membership_status === "pending" &&
                      row.claim_source === "self_claim";
                    const isPendingInvitation =
                      row.membership_status === "pending" &&
                      row.claim_source ===
                        "clinic_invitation";

                    return (
                      <article
                        key={row.professional_user_id}
                      >
                        <div>
                          <h3>
                            {professional?.full_name ||
                              row.designation ||
                              "Professional affiliation"}
                          </h3>
                          <p>
                            {row.designation ||
                              professional?.professional_type ||
                              "Designation not specified"}
                          </p>
                          {professional?.city && (
                            <p>{professional.city}</p>
                          )}
                          <div className="status-cluster">
                            <span
                              className={`status-pill status-${row.membership_status}`}
                            >
                              {row.membership_status}
                            </span>
                            <span className="status-pill">
                              {row.claim_source.replaceAll(
                                "_",
                                " ",
                              )}
                            </span>
                            {row.is_primary && (
                              <span className="status-pill">
                                primary
                              </span>
                            )}
                            {row.is_public && (
                              <span className="status-pill">
                                public
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="card-actions">
                          {isPendingSelfClaim && (
                            <>
                              <form
                                action={
                                  reviewClinicMembershipAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="clinic_id"
                                  value={clinic.id}
                                />
                                <input
                                  type="hidden"
                                  name="professional_user_id"
                                  value={
                                    row.professional_user_id
                                  }
                                />
                                <input
                                  type="hidden"
                                  name="decision"
                                  value="approve"
                                />
                                <button
                                  className="button button-primary"
                                  type="submit"
                                >
                                  Approve claim
                                </button>
                              </form>

                              <form
                                action={
                                  reviewClinicMembershipAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="clinic_id"
                                  value={clinic.id}
                                />
                                <input
                                  type="hidden"
                                  name="professional_user_id"
                                  value={
                                    row.professional_user_id
                                  }
                                />
                                <input
                                  type="hidden"
                                  name="decision"
                                  value="reject"
                                />
                                <button
                                  className="button button-secondary"
                                  type="submit"
                                >
                                  Reject
                                </button>
                              </form>
                            </>
                          )}

                          {isPendingInvitation && (
                            <span className="status-pill">
                              Awaiting professional response
                            </span>
                          )}

                          {row.membership_status ===
                            "active" &&
                            row.is_public &&
                            !row.is_primary && (
                              <form
                                action={
                                  setClinicPrimaryMemberAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="clinic_id"
                                  value={clinic.id}
                                />
                                <input
                                  type="hidden"
                                  name="professional_user_id"
                                  value={
                                    row.professional_user_id
                                  }
                                />
                                <button
                                  className="button button-secondary"
                                  type="submit"
                                >
                                  Set primary
                                </button>
                              </form>
                            )}

                          {row.membership_status ===
                            "active" && (
                            <form
                              action={endClinicMemberAction}
                            >
                              <input
                                type="hidden"
                                name="clinic_id"
                                value={clinic.id}
                              />
                              <input
                                type="hidden"
                                name="professional_user_id"
                                value={
                                  row.professional_user_id
                                }
                              />
                              <button
                                className="button button-secondary"
                                type="submit"
                              >
                                End affiliation
                              </button>
                            </form>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <form
                action={inviteClinicMemberAction}
                className="workspace-inline-form"
              >
                <input
                  type="hidden"
                  name="clinic_id"
                  value={clinic.id}
                />
                <h3>Invite a verified professional</h3>

                <label>
                  Professional
                  <select
                    name="professional_user_id"
                    required
                    defaultValue=""
                  >
                    <option value="">
                      Select from professional directory
                    </option>
                    {invitationCandidates.map((row) => (
                      <option
                        key={row.user_id}
                        value={row.user_id ?? ""}
                      >
                        {row.full_name}
                        {row.current_position
                          ? ` · ${row.current_position}`
                          : ""}
                        {row.city ? ` · ${row.city}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Clinic designation
                  <input
                    name="designation"
                    placeholder="Veterinarian, surgeon, consultant, medical director"
                  />
                </label>

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    name="is_public"
                    defaultChecked
                  />{" "}
                  Publish affiliation after acceptance
                </label>

                <FormSubmitButton pendingLabel="Sending invitation...">
                  Invite professional
                </FormSubmitButton>
              </form>
            </section>
          </div>

          <section className="backend-form-card workspace-section-card workspace-heading-gap">
            <div className="section-heading">
              <span className="section-kicker">
                APPOINTMENT REQUESTS
              </span>
              <h2>Clinic appointment inbox.</h2>
              <p>
                Public requests enter here. Confirm a date/time,
                contact the client, complete or decline the request
                without exposing internal notes publicly.
              </p>
            </div>

            <div className="workspace-record-list">
              {appointments.length === 0 ? (
                <p>No appointment requests yet.</p>
              ) : (
                appointments.map((appointment) => {
                  const service = appointment.service_id
                    ? catalogMap.get(appointment.service_id)
                    : null;

                  return (
                    <article key={appointment.id}>
                      <div>
                        <h3>{appointment.contact_name}</h3>
                        <p>
                          {service?.service_name ||
                            "General appointment"}
                          {appointment.animal_species
                            ? ` · ${appointment.animal_species}`
                            : ""}
                        </p>
                        <p>{appointment.reason}</p>
                        <div className="status-cluster">
                          <span
                            className={`status-pill status-${appointment.status}`}
                          >
                            {appointment.status}
                          </span>
                          {appointment.preferred_date && (
                            <span className="status-pill">
                              Preferred{" "}
                              {appointment.preferred_date}{" "}
                              {appointment.preferred_time ||
                                ""}
                            </span>
                          )}
                          {appointment.scheduled_date && (
                            <span className="status-pill">
                              Scheduled{" "}
                              {appointment.scheduled_date}{" "}
                              {appointment.scheduled_time
                                ?.slice(0, 5) || ""}
                            </span>
                          )}
                        </div>
                        <p>
                          {[
                            appointment.contact_phone,
                            appointment.contact_email,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <form
                        className="workspace-inline-form"
                        action={updateClinicAppointmentAction}
                      >
                        <input
                          type="hidden"
                          name="clinic_id"
                          value={clinic.id}
                        />
                        <input
                          type="hidden"
                          name="appointment_id"
                          value={appointment.id}
                        />

                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={appointment.status}
                          >
                            <option value="new">New</option>
                            <option value="contacted">
                              Contacted
                            </option>
                            <option value="scheduled">
                              Scheduled
                            </option>
                            <option value="completed">
                              Completed
                            </option>
                            <option value="declined">
                              Declined
                            </option>
                            <option value="closed">Closed</option>
                          </select>
                        </label>

                        <div className="form-grid">
                          <label>
                            Confirmed date
                            <input
                              type="date"
                              name="scheduled_date"
                              defaultValue={
                                appointment.scheduled_date ??
                                appointment.preferred_date ??
                                ""
                              }
                            />
                          </label>
                          <label>
                            Confirmed time
                            <input
                              type="time"
                              name="scheduled_time"
                              defaultValue={
                                appointment.scheduled_time?.slice(
                                  0,
                                  5,
                                ) ??
                                appointment.preferred_time?.slice(
                                  0,
                                  5,
                                ) ??
                                ""
                              }
                            />
                          </label>
                        </div>

                        <label>
                          Internal clinic note
                          <textarea
                            name="owner_note"
                            defaultValue={
                              appointment.owner_note ?? ""
                            }
                          />
                        </label>

                        <FormSubmitButton pendingLabel="Updating request...">
                          Update request
                        </FormSubmitButton>
                      </form>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
