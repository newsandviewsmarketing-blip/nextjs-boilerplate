/* eslint-disable @next/next/no-img-element -- Approved Supabase Storage URLs are displayed directly. */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CareerWorkspaceFrame from "@/app/components/CareerWorkspaceFrame";
import ClinicFacilityTypeField from "../ClinicFacilityTypeField";
import ClinicFocusFields from "../ClinicFocusFields";
import ClinicRateCard from "../ClinicRateCard";
import CompactClinicHours from "../CompactClinicHours";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import PakistanLocationFields from "../../../components/PakistanLocationFields";
import ProfilePhoto from "../../../components/ProfilePhoto";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/directories";
import {clinicPracticeReadiness} from "@/lib/clinic-practice-readiness";
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
  responsible_veterinarian_name: string|null;
  responsible_veterinarian_pvmc: string|null;
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
        "id, slug, clinic_name, responsible_veterinarian_name, responsible_veterinarian_pvmc, facility_type, description, province, district, tehsil, city, address, public_phone, public_email, website, working_hours, emergency_service, services, species, verification_status, rejection_reason, is_published, logo_url, cover_image_url",
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
  const readinessIssues=clinicPracticeReadiness(
    clinic,
    availability.filter(day=>day.is_open).length,
    clinicServices.filter(service=>service.is_public&&service.is_active).length
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
    <CareerWorkspaceFrame active="clinic" module="clinic"
      name={identity.profile?.full_name||identity.email}
      headline={clinic.facility_type}
      title={clinic.clinic_name}
      description="Manage your registered veterinary practice, services, appointment availability and team from your personal VetConnect workspace.">
      <section className="vcx-clinic-operations">
       <div className="vcx-clinic-identity-bar">
        <div><span className="vcx-eyebrow">CLINIC MANAGEMENT</span><strong>{clinic.facility_type}</strong><small>{[clinic.city,clinic.province].filter(Boolean).join(", ")||"Location not yet specified"}</small></div>
        <div className="vcx-pills"><span>Review: {clinic.verification_status}</span><span>{clinic.is_published?"Published":"Unpublished"}</span></div>
        <div className="vcx-clinic-action-row">
         {clinic.is_published&&<Link className="vcx-button vcx-button-outline" href={`/clinics/${clinic.slug}`}>Public clinic page</Link>}
         <Link className="vcx-button vcx-button-outline" href="/career/connections">All my connections</Link>
        </div>
       </div>
       <section className="vcx-clinic-workflow" aria-label="Clinic setup progress">
        <div className="vcx-clinic-workflow-heading">
          <div><span className="vcx-eyebrow">NEXT STEPS</span><h2>Set up your practice for bookings and public listing</h2>
          <p>Complete your service details, opening hours and team information. The public listing is enabled only after VetConnect approval.</p></div>
          <span className="vcx-clinic-workflow-count">{[
            Boolean(clinic.clinic_name && clinic.city && clinic.address),
            availability.some(day=>day.is_open),
            clinicServices.some(service=>service.is_active&&service.is_public),
            clinic.verification_status==="approved"&&clinic.is_published
          ].filter(Boolean).length} / 4 steps</span>
        </div>
        <div className="vcx-clinic-workflow-grid">
          <a href="#clinic-identity" className="vcx-clinic-workflow-item">
            <span className="vcx-clinic-workflow-number">01</span><strong>Clinic details</strong>
            <small>{clinic.clinic_name && clinic.city && clinic.address?"Basic details entered":"Complete location and identity"}</small>
          </a>
          <a href="#clinic-hours" className="vcx-clinic-workflow-item">
            <span className="vcx-clinic-workflow-number">02</span><strong>Timings & slots</strong>
            <small>{availability.some(day=>day.is_open)?"Opening days saved":"Set weekdays, breaks and booking slots"}</small>
          </a>
          <a href="#clinic-services" className="vcx-clinic-workflow-item">
            <span className="vcx-clinic-workflow-number">03</span><strong>Services & fees</strong>
            <small>{clinicServices.some(service=>service.is_active&&service.is_public)?"Public service offering saved":"Select catalogue service, fee and duration"}</small>
          </a>
          <a href="#clinic-team" className="vcx-clinic-workflow-item">
            <span className="vcx-clinic-workflow-number">04</span><strong>Review & public page</strong>
            <small>{clinic.verification_status==="approved"&&clinic.is_published?"Public listing active":"Team, PVMC and VetConnect approval"}</small>
          </a>
        </div>
        <p className="form-help">Service focus choices in the clinic profile are not automatically bookable. To accept online requests, add an active catalogue service below, enable booking for it, and activate appointment hours.</p>
        {clinic.is_published&&<Link className="vcx-button vcx-button-outline" href={`/clinics/${clinic.slug}`}>View public clinic profile</Link>}
       </section>
       <nav className="vcx-clinic-jump" aria-label="Clinic setup sections">
        <a href="#clinic-identity">01 · Details & PVMC</a>
        <a href="#clinic-hours">02 · Hours</a>
        <a href="#clinic-services">03 · Services & fees</a>
        <a href="#clinic-team">04 · Team</a>
        <a href="#clinic-appointments">05 · Appointments</a>
       </nav>
       <section className="vcx-clinic-readiness" aria-label="Clinic publication readiness">
         <div><span className="vcx-eyebrow">FACILITY REVIEW</span><h2>{readinessIssues.length===0?"Core clinic details ready for VetConnect review":"Complete your clinic before publication"}</h2>
          <p>Saving the clinic does not verify a veterinarian&apos;s registration. VetConnect administrators separately review credentials and facility information before publishing.</p></div>
         {readinessIssues.length>0?<ul>{readinessIssues.map(issue=><li key={issue}>{issue}</li>)}</ul>:
          <p className="vcx-secondary">Core fields are present. Administrator credential verification and publication approval are still required.</p>}
       </section>
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

          <form id="clinic-identity"
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

              <ClinicFacilityTypeField defaultValue={clinic.facility_type} />

              <div className="form-span-2">
                <h3>Responsible veterinarian & PVMC registration</h3>
                <p className="form-help">Clinical services must be linked to a registered veterinarian. The name and number are for private VetConnect administrator review, not a public PVMC-verified badge.</p>
              </div>
              <div>
                <label htmlFor="edit-responsible-vet">Responsible veterinarian&apos;s name</label>
                <input id="edit-responsible-vet" name="responsible_veterinarian_name" maxLength={180} defaultValue={clinic.responsible_veterinarian_name??""}/>
              </div>
              <div>
                <label htmlFor="edit-responsible-pvmc">PVMC registration number</label>
                <input id="edit-responsible-pvmc" name="responsible_veterinarian_pvmc" maxLength={70} defaultValue={clinic.responsible_veterinarian_pvmc??""}/>
                <p className="form-help">Check registration with <a href="https://pvmc.gov.pk/Registration/Search" target="_blank" rel="noopener noreferrer">PVMC&apos;s official registry</a>. Entering a number does not verify it.</p>
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

              <ClinicFocusFields services={clinic.services} species={clinic.species}/>

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

          <CompactClinicHours clinicId={clinic.id} existing={availability} action={saveClinicAvailabilityAction}/>

          <div className="workspace-two-column workspace-heading-gap">
            <section className="backend-form-card workspace-section-card">
              <ClinicRateCard clinicId={clinic.id} catalogue={catalog} offerings={clinicServices}
                addAction={addClinicServiceAction} removeAction={removeClinicServiceAction}
                submitButton={<FormSubmitButton pendingLabel="Saving service...">Add service to rate card</FormSubmitButton>}/>
            </section>

            <section className="backend-form-card workspace-section-card">
              <div className="section-heading">
                <span className="section-kicker">
                  TEAM HIERARCHY
                </span>
                <h2 id="clinic-team">Owner, primary professional and clinic team.</h2>
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
              <h2 id="clinic-appointments">Clinic appointment inbox.</h2>
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
      </section>
    </CareerWorkspaceFrame>
  );
}
