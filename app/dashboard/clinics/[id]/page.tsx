import ClinicAppointmentCalendar from "../ClinicAppointmentCalendar";
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
  saveClinicScheduleExceptionAction,
  removeClinicScheduleExceptionAction,
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
  // Exception dates are independent of weekly availability.
  // This page must remain readable if the additive migration has not run yet.
  const {data:exceptionRows,error:exceptionLoadError}=await supabase
    .from("clinic_schedule_exceptions")
    .select("id,exception_date,repeat_monthly,repeat_until,is_closed,opens_at,closes_at,reason,appointment_enabled")
    .eq("clinic_id",id).order("exception_date",{ascending:true}).limit(100);
  type ClinicDateException={
    id:string;exception_date:string;repeat_monthly:boolean;repeat_until:string|null;is_closed:boolean;opens_at:string|null;
    closes_at:string|null;reason:string|null;appointment_enabled:boolean;
  };
  const exceptions=(exceptionRows??[]) as ClinicDateException[];
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
       <nav aria-label="My Clinic workspace" className="vcx-clinic-workflow">
        <div className="vcx-clinic-workflow-heading"><div><span className="vcx-eyebrow">MY CLINIC</span><h2>Practice management workspace</h2><p>Choose a section to manage your practice.</p></div></div>
        <div className="vcx-clinic-workflow-grid">
          {[
            ["Clinic registration & profile","#clinic-identity","Identity, location and professional credentials"],
            ["Calendar & availability","#clinic-hours","Weekly hours and booking slots"],
            ["Holidays & special dates","#clinic-date-exceptions","Date-specific schedule changes"],
            ["Services & rate card","#clinic-services","Consultation fees and bookable services"],
            ["Clinic team","#clinic-team","Owner and professional affiliations"],
            ["Appointments","#clinic-appointments","Manage incoming booking requests"]
          ].map(([label,href,description])=><a key={href} href={href} className="vcx-clinic-workflow-item vcx-clinic-workflow-section"><strong>{label}</strong><small>{description}</small></a>)}
        </div>
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
              <b>{servicesResult.error ? "Unavailable" : clinicServices.length}</b>
              <span>Standardized services</span>
            </article>
            <article>
              <b>{membersResult.error ? "Unavailable" : activeMembers.length}</b>
              <span>Active team links</span>
            </article>
            <article>
              <b>{appointmentsResult.error ? "Unavailable" : appointments.filter((row) => row.status === "new").length}</b>
              <span>New among recent requests</span>
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

          <section className="backend-form-card workspace-section-card vcx-clinic-special-dates" aria-labelledby="clinic-date-exceptions">
            <div className="section-heading">
              <span className="section-kicker">HOLIDAYS & SPECIAL DATES</span>
              <h2 id="clinic-date-exceptions">Closed dates & special opening hours</h2>
              <p>Keep your regular weekly schedule. Add holidays, monthly closures or one-time changes by date. A date exception takes priority over the weekly hours when accepting appointment requests.</p>
            </div>
            {exceptionLoadError?<p role="status">Special-date scheduling is not available until its database migration is installed. Your weekly hours are unchanged.</p>:<>
              <div className="vcx-special-date-records">
                {exceptions.length===0?<p>No special dates recorded.</p>:
                 exceptions.map(row=><article className="vcx-special-date-row" key={row.id}>
                   <div><strong>{row.exception_date}</strong>
                    <p>{row.is_closed?"Closed / holiday":`Special hours: ${row.opens_at?.slice(0,5)}–${row.closes_at?.slice(0,5)}`}
                      {row.reason?` · ${row.reason}`:""}{row.repeat_monthly?` · Repeats monthly${row.repeat_until?` until ${row.repeat_until}`:""}`:""}</p>
                   </div>
                   <form action={removeClinicScheduleExceptionAction}>
                    <input type="hidden" name="clinic_id" value={clinic.id}/>
                    <input type="hidden" name="exception_id" value={row.id}/>
                    <button className="button button-secondary" type="submit">Remove</button>
                   </form>
                 </article>)}
              </div>
              <details className="vcx-special-date-add">
                <summary>+ Add holiday or special hours</summary>
                <form action={saveClinicScheduleExceptionAction} className="vcx-special-date-form">
                  <input type="hidden" name="clinic_id" value={clinic.id}/>
                  <div className="form-grid">
                    <label>Date<input type="date" name="exception_date" required/></label>
                    <label>Schedule change
                      <select name="schedule_type" defaultValue="closed">
                        <option value="closed">Closed / holiday</option>
                        <option value="adjusted">Special opening hours</option>
                      </select>
                    </label>
                    <label>Special opening time (if adjusted)<input type="time" name="opens_at"/></label>
                    <label>Special closing time (if adjusted)<input type="time" name="closes_at"/></label>
                  </div>
                  <label className="checkbox-line"><input type="checkbox" name="repeat_monthly"/>Repeat on this day of each month</label>
                  <label>End monthly repetition (optional)<input type="date" name="repeat_until"/></label>
                  <label>Reason or notice (optional)<input name="reason" maxLength={160} placeholder="e.g. Public holiday, monthly stocktake"/></label>
                  <label className="checkbox-line"><input type="checkbox" name="appointment_enabled"/>Accept appointment requests on this special date (only when open)</label>
                  <FormSubmitButton pendingLabel="Saving special date...">Save special date</FormSubmitButton>
                </form>
              </details>
            </>}
          </section>

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
                      …16741 tokens truncated…: 16px;
}
.product-specs > div {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.product-specs dt {
  margin-bottom: 6px;
  font-weight: 800;
}
.product-specs dd {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}
.product-disclaimer {
  margin-top: 24px;
  padding: 15px;
  border-radius: 10px;
  background: var(--soft);
  font-size: 13px;
}
.form-help {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.company-logo {
  object-fit: contain;
  background: #fff;
}
.company-profile-hero {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 32px;
  align-items: center;
}
.company-profile-logo {
  width: 150px;
  height: 150px;
  border-radius: 22px;
  object-fit: contain;
  background: #fff;
}

@media (max-width: 900px) {
  .company-workspace-grid,
  .product-detail-grid,
  .product-copy-grid {
    grid-template-columns: 1fr;
  }
  .product-management {
    position: static;
  }
  .product-information-grid,
  .company-contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 780px) {
  .admin-control-layout {
    display: block;
  }

  .admin-navigation {
    width: 100%;
    margin-bottom: 24px;
  }

  .admin-navigation nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .admin-navigation nav {
    grid-template-columns: 1fr;
  }

  .company-summary,
  .inquiry-grid,
  .product-information-grid,
  .company-contact-grid,
  .company-profile-hero {
    grid-template-columns: 1fr;
  }

  .product-detail-visual {
    min-height: 260px;
  }

  .resend-form {
    flex-direction: column;
  }
}

/* =========================================
   FINAL ADMIN LAYOUT STABILIZATION
   Desktop / Laptop = fixed left column
   Mobile = full-width navigation
   ========================================= */

@media (min-width: 641px) {
  .admin-control-layout {
    display: grid;
    grid-template-columns: 245px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  .admin-navigation {
    position: static;
    top: auto;

    width: 245px;
    max-width: 245px;
    max-height: none;

    overflow: visible;
    margin-bottom: 0;

    align-self: start;
    z-index: auto;
  }

  .admin-navigation nav {
    display: grid;
    grid-template-columns: 1fr;
  }

  .admin-control-content {
    min-width: 0;
    width: 100%;
  }
}


/* Mobile only */
@media (max-width: 640px) {
  .admin-control-layout {
    display: block;
  }

  .admin-navigation {
    position: static;
    top: auto;

    width: 100%;
    max-width: none;
    max-height: none;

    overflow: visible;
    margin-bottom: 24px;
  }

  .admin-navigation nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}


@media (max-width: 520px) {
  .admin-navigation nav {
    grid-template-columns: 1fr;
  }
}

/* VetConnect standardized admin directory */
.admin-directory-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  margin: 22px 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.admin-directory-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin: 0 0 34px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}
.admin-directory-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
  font-size: 11px;
}
.admin-directory-table th,
.admin-directory-table td {
  padding: 12px 13px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.admin-directory-table th {
  position: sticky;
  top: 0;
  background: #f7f9fc;
  color: var(--navy);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.admin-directory-table td b,
.admin-directory-table td small {
  display: block;
}
.admin-directory-table td small {
  margin-top: 4px;
  color: var(--muted);
}
.admin-directory-table tbody tr:hover {
  background: #fbfcfe;
}
.admin-role-heading {
  margin-top: 34px;
}
@media (max-width: 900px) {
  .admin-directory-filters { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .admin-directory-filters { grid-template-columns: 1fr; }
}

/* =========================================
   VetConnect professional and clinic workspaces
   ========================================= */
.service-selector-fieldset {
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.service-selector-fieldset legend {
  padding: 0 6px;
  font-weight: 800;
  color: var(--navy);
}
.service-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}
.professional-workspace-overview,
.clinic-media-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, .8fr);
  gap: 20px;
  align-items: stretch;
  margin-bottom: 22px;
}
.professional-photo-card {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
}
.professional-photo-large {
  width: 132px;
  height: 132px;
  min-width: 132px;
  overflow: hidden;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: var(--soft);
  color: var(--navy);
  font-size: 34px;
  font-weight: 900;
}
.professional-photo-large .profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.professional-photo-upload {
  align-self: stretch;
}
.workspace-section-card {
  margin-top: 22px;
}
.workspace-heading-gap {
  margin-top: 34px;
}
.workspace-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  align-items: start;
}
.workspace-record-list {
  display: grid;
  gap: 12px;
  margin: 16px 0 22px;
}
.workspace-record-list > article {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.workspace-record-list h3,
.public-timeline-list h3 {
  margin: 0 0 6px;
}
.workspace-record-list p,
.public-timeline-list p {
  margin: 4px 0;
  color: var(--muted);
  line-height: 1.55;
}
.workspace-inline-form {
  display: grid;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.workspace-inline-form label {
  display: grid;
  gap: 7px;
}
.workspace-muted {
  color: var(--muted);
}
.save-job-form {
  margin-top: 14px;
}
.clinic-workspace-grid .status-cluster {
  margin: 14px 0;
}
.clinic-cover-preview {
  width: 100%;
  min-height: 220px;
  height: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--soft);
}
.clinic-public-cover {
  width: 100%;
  max-height: 360px;
  overflow: hidden;
  background: var(--soft);
}
.clinic-public-cover img {
  width: 100%;
  height: min(34vw, 360px);
  min-height: 220px;
  object-fit: cover;
  display: block;
}
.public-service-list {
  margin-top: 12px;
}
.professional-public-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
.professional-public-sidebar {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 92px;
}
.professional-public-sidebar article,
.professional-timeline-card {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
}
.professional-public-sidebar h3 {
  margin: 7px 0 5px;
}
.professional-public-sidebar p {
  margin: 5px 0;
  color: var(--muted);
  line-height: 1.6;
}
.professional-public-main {
  display: grid;
  gap: 18px;
}
.professional-timeline-card h2 {
  margin-top: 6px;
}
.public-timeline-list {
  display: grid;
  gap: 0;
  margin-top: 14px;
}
.public-timeline-list > div {
  padding: 16px 0;
  border-top: 1px solid var(--line);
}
.public-timeline-list > div:first-child {
  border-top: 0;
}

@media (max-width: 920px) {
  .professional-workspace-overview,
  .clinic-media-layout,
  .workspace-two-column,
  .professional-public-layout {
    grid-template-columns: 1fr;
  }
  .professional-public-sidebar {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .service-checkbox-grid,
  .professional-public-sidebar {
    grid-template-columns: 1fr;
  }
  .professional-photo-card {
    align-items: flex-start;
    flex-direction: column;
  }
  .professional-photo-large {
    width: 112px;
    height: 112px;
    min-width: 112px;
  }
  .workspace-record-list > article {
    flex-direction: column;
  }
}

.admin-pulse-panel,
.admin-recent-activity {
  margin-top: 1.5rem;
  padding: 1.2rem;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--white);
}

.compact-heading {
  margin-bottom: 1rem;
}

.admin-pulse-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.admin-pulse-grid article {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.9rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--soft);
}

.admin-pulse-grid b {
  font-size: 1.5rem;
  color: var(--navy);
}

.admin-pulse-grid span,
.admin-activity-list span {
  color: var(--muted);
  font-size: 0.82rem;
}

.admin-activity-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-activity-header h2 {
  margin: 0.2rem 0 0;
}

.admin-activity-list {
  display: grid;
  gap: 0.55rem;
}

.admin-activity-list article {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.admin-activity-list article > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.15rem;
}

.admin-activity-index {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--navy);
  color: white !important;
  font-weight: 800;
}

@media (max-width: 900px) {
  .admin-pulse-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .admin-pulse-grid {
    grid-template-columns: 1fr;
  }

  .admin-activity-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

.admin-import-panel {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(15, 39, 81, 0.12);
}

.review-documents {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  margin: 1rem 0;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(15, 39, 81, 0.12);
  border-radius: 12px;
  background: rgba(245, 248, 253, 0.8);
}

.review-documents b {
  width: 100%;
}


/* VetConnect career applications, responsive job details and verified latest jobs. */
.job-detail-grid {
 display:grid;
 grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr);
 align-items:start;
 gap:clamp(18px,4vw,38px);
}
.job-detail-grid > *,
.cv-builder-layout > * {min-width:0;}
.job-detail-hero h1 {max-width:900px;overflow-wrap:anywhere;}
.job-description,.job-apply-card p {overflow-wrap:anywhere;white-space:pre-line;}
.job-mobile-apply-link {display:none;}
.job-cv-actions {display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 20px;}
.job-cv-actions .button {min-width:0;white-space:normal;text-align:center;}
.job-application-form{display:grid;gap:12px;margin-top:12px;}
.job-application-form textarea{min-height:116px;}
.job-advertisement{margin:26px 0 16px;padding:14px;background:var(--soft);border-radius:14px;border:1px solid var(--line);}
.job-advertisement img{width:100%;height:auto;max-height:720px;object-fit:contain;display:block;border-radius:8px;}
.job-advertisement figcaption{font-size:0.8rem;color:var(--muted);margin-top:9px;}
.job-advertisement a{display:inline-block;margin-top:10px;}
.career-cv-library{margin:0 0 26px;}
.career-cv-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;}
.career-cv-grid>*{min-width:0;}
.career-cv-list{padding-left:20px;overflow-wrap:anywhere;}
.cv-builder-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);align-items:start;gap:24px;}
.cv-print-sheet{line-height:1.65;}
.cv-print-sheet section{border-top:1px solid var(--line);padding-top:14px;margin-top:18px;}
.cv-preserve-lines{white-space:pre-wrap;overflow-wrap:anywhere;}
.cv-print-actions{margin-top:24px;}
.jobs-featured-below-hero{padding-top:32px;padding-bottom:34px;}
.current-jobs-panel{min-width:0;}
.job-sector-filters{display:flex;gap:8px;overflow-x:auto;padding:6px 2px 14px;scrollbar-width:thin;}
.job-sector-pill{font:inherit;font-size:.88rem;white-space:nowrap;padding:10px 15px;cursor:pointer;border:1px solid var(--line);border-radius:100px;background:#fff;color:var(--navy);}
.job-sector-pill.active{background:var(--navy);border-color:var(--navy);color:white;}
.job-sector-pill:focus-visible,.current-job-slide a:focus-visible{outline:3px solid var(--orange);outline-offset:3px;}
.current-jobs-track{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,32%);gap:15px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;padding:10px 3px 18px;}
.current-job-slide{display:flex;flex-direction:column;align-items:flex-start;scroll-snap-align:start;min-width:0;background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;}
.current-job-slide h3{font-size:1.15rem;line-height:1.3;margin:12px 0 8px;overflow-wrap:anywhere;}
.current-job-slide p{margin:5px 0;color:var(--muted);overflow-wrap:anywhere;}
.current-job-slide .button{margin-top:auto;white-space:normal;text-align:center;}
.current-jobs-footer{padding-top:10px;font-weight:700;}
@media (max-width:900px){
 .job-detail-grid,.cv-builder-layout{grid-template-columns:1fr;}
 .job-detail-hero h1{font-size:clamp(1.85rem,6vw,2.7rem);line-height:1.13;}
 .current-jobs-track{grid-auto-columns:minmax(235px,52%);}
}
@media (max-width:640px){
 .job-detail-hero{padding-top:32px;padding-bottom:34px;}
 .job-detail-hero h1{font-size:clamp(1.75rem,7vw,2.4rem);}
 .job-mobile-apply-link{display:inline-flex;margin-top:18px;min-height:44px;}
 .job-detail-grid{gap:16px;}
 .job-opportunity-card,.job-apply-card{padding:clamp(16px,5vw,24px);}
 .job-cv-actions{flex-direction:column;}
 .job-cv-actions .button,.job-application-form .button{width:100%;}
 .career-cv-grid{grid-template-columns:1fr;}
 .career-cv-library{padding:16px;}
 .current-jobs-track{grid-auto-columns:minmax(245px,85%);gap:12px;}
 .current-job-slide{padding:16px;}
 .job-sector-filters{margin-right:-12px;}
 .jobs-featured-below-hero{padding-top:20px;}
 .product-specs div{min-width:0;overflow-wrap:anywhere;}
}

.job-media-admin-row{margin:16px 0;padding:16px;border:1px solid var(--line);border-radius:14px;overflow-wrap:anywhere;}
.job-media-admin-row h3{margin:0 0 9px;}
.job-media-admin-row form{margin:9px 0 13px;}
@media(max-width:640px){.job-media-admin-row{padding:13px;}.job-media-admin-row button{width:100%;}}

/* Profile-status guidance stays visible and readable before an application is unlocked. */
.job-eligibility-box{
  border:1px solid var(--line);
  background:var(--soft);
  border-radius:14px;
  padding:clamp(16px,3vw,23px);
  margin:16px 0 12px;
}
.job-eligibility-box h3{font-size:1.17rem;color:var(--navy);margin:0 0 10px;}
.job-eligibility-box p{margin:8px 0;line-height:1.6;}
.job-eligibility-box .job-cv-actions{margin:16px 0 0;}
.job-apply-card{scroll-margin-top:100px;}
@media(max-width:640px){
  .job-eligibility-box .button{width:100%;}
  .job-apply-card{scroll-margin-top:76px;}
}

.guest-job-apply{padding:18px;margin:18px 0;border:1px solid var(--line);border-radius:14px;}
.guest-job-apply h3{font-size:1.15rem;margin-bottom:10px;}
.guest-consent{display:flex;gap:9px;align-items:flex-start;line-height:1.4;}
.guest-consent input{width:auto;flex:none;margin-top:4px;}
.cf-turnstile{max-width:100%;overflow:hidden;}
@media(max-width:640px){.guest-job-apply{padding:14px;}.guest-job-apply .button{width:100%;}}

/* Phase 2 coordinated operations UI. No gradients or decorative 3D effects. */
:root { --vc-navy:#1c304c; --vc-teal:#075f66; --vc-accent:#d87b35; --vc-canvas:#f5f8fb; --vc-border:#dce5ed; }
.vc-sidebar { border-radius:14px; border-color:var(--vc-border); box-shadow:none; }
.vc-sidebar-brand { background:var(--vc-navy); padding:19px; }
.vc-sidebar-brand span { color:#ffd1a6; }
.vc-sidebar-fold summary { display:none; }
.vc-sidebar .vc-nav-section { padding:12px 9px; border-bottom:1px solid var(--vc-border); }
.vc-sidebar .vc-nav-label { display:block; padding:7px 12px; color:#637587; text-transform:uppercase; font-size:10px; letter-spacing:.10em; font-weight:800; }
.vc-sidebar .vc-nav-section a { display:block; padding:9px 12px; border-radius:9px; color:var(--vc-navy); font-size:13px; font-weight:650; }
.vc-sidebar .vc-nav-section a:hover,.vc-sidebar .vc-nav-section a:focus-visible { background:#edf5f5; color:var(--vc-teal); outline-offset:2px; }
.vc-review-target { scroll-margin-top:102px; }
.vc-review-target:target { outline:2px solid var(--vc-teal); outline-offset:5px; border-radius:12px; }
.vc-company-metrics .vc-metric-link { display:block; min-height:90px; text-decoration:none; }
.vc-company-metrics .vc-metric-link:focus-visible { outline:2px solid var(--vc-teal); outline-offset:3px; }
.vc-customer-hub { padding:22px 26px; margin:0 0 24px; background:#fff; border:1px solid var(--vc-border); border-radius:14px; }
.vc-customer-hub-head { display:flex; gap:20px; justify-content:space-between; align-items:center; }
.vc-customer-hub h2 { color:var(--vc-navy); font-size:1.5rem; margin:7px 0; }
.vc-customer-hub p { color:#576678; line-height:1.6; margin:0; }
.vc-customer-shortcuts { display:flex; gap:9px; flex-wrap:wrap; margin:16px 0 23px; }
.vc-customer-shortcuts a { background:#edf5f5; border:1px solid #d4e5e5; color:#07555b; padding:10px 13px; border-radius:9px; text-decoration:none; font-size:13px; font-weight:750; }
.vc-customer-shortcuts a:hover,.vc-customer-shortcuts a:focus-visible { background:#dbeeed; outline-offset:2px; }
@media(max-width:780px){
  .vc-sidebar { position:static; width:100%; max-width:none; margin-bottom:18px; }
  .vc-sidebar-fold summary { display:block; padding:14px 17px; cursor:pointer; background:#eef4f7; font-weight:800; color:var(--vc-navy); }
  .vc-sidebar .vc-nav-section a { min-height:43px; }
  .vc-customer-hub-head { align-items:flex-start; flex-direction:column; }
  .vc-customer-hub { padding:17px; }
}
@media print {.vc-sidebar,.site-header,.site-footer,.vc-customer-shortcuts,.vc-report-actions,.vc-admin-actions {display:none!important} .vc-review-target:target {outline:0}}

/* Phase 2: responsive executive operations dashboard */
.vc-admin-page{background:var(--vc-canvas);min-height:100vh}
.vc-admin-banner{background:var(--vc-navy);color:#fff;padding:33px 0}
.vc-admin-banner-content{display:flex;align-items:center;justify-content:space-between;gap:24px}
.vc-admin-banner .section-kicker{color:#fbc69b}
.vc-admin-banner h1{font-size:clamp(1.7rem,3.2vw,2.45rem);margin:7px 0 8px;color:#fff;letter-spacing:-.03em}
.vc-admin-banner p{color:#dce6ed;margin:0;line-height:1.6}
.vc-admin-actions{display:flex;gap:9px;flex-wrap:wrap}
.vc-admin-layout{gap:22px}
.vc-admin-main{min-width:0}
.vc-admin-toolbar{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:21px}
.vc-admin-toolbar h2{font-size:1.6rem;color:var(--vc-navy);margin:4px 0}
.vc-admin-toolbar p{color:#647084;margin:0}
.vc-admin-global-search{flex:0 1 340px}
.vc-admin-global-search label{display:block;font-size:11px;font-weight:750;color:#5f7286;margin-bottom:6px}
.vc-admin-global-search div{display:flex;gap:5px}
.vc-admin-global-search input{flex:1;min-width:0;border:1px solid var(--vc-border);border-radius:8px;padding:10px 12px}
.vc-admin-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px;margin:0 0 26px}
.vc-admin-metric{background:#fff;border:1px solid var(--vc-border);border-radius:12px;padding:16px;display:flex;flex-direction:column;min-height:145px;color:var(--vc-navy);box-shadow:0 4px 18px rgba(14,43,72,.035);transition:border-color .15s,transform .15s}
.vc-admin-metric:hover,.vc-admin-metric:focus-visible{border-color:var(--vc-teal);transform:translateY(-2px);outline-offset:2px}
.vc-admin-metric>span:first-child{font-size:12px;font-weight:760}
.vc-admin-metric b{font-size:2rem;line-height:1.2;margin-top:11px;font-weight:800;font-variant-numeric:tabular-nums}
.vc-admin-metric small{font-size:11px;color:#67788b;line-height:1.5;margin-top:3px}
.vc-metric-action{font-size:11px;color:var(--vc-teal);font-weight:800;margin-top:auto;padding-top:12px}
.vc-admin-metric-priority{border-top:3px solid var(--vc-accent)}
.vc-admin-panel{background:#fff;border:1px solid var(--vc-border);border-radius:14px;padding:21px;margin-bottom:21px}
.vc-panel-header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:16px}
.vc-panel-header h2{font-size:1.38rem;color:var(--vc-navy);margin:4px 0}
.vc-panel-header p{color:#69788a;font-size:13px;margin:4px 0}
.vc-panel-header>a{color:var(--vc-teal);font-size:13px;font-weight:750}
.vc-admin-filter-row{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:0 0 14px}
.vc-admin-filter-row>div{flex:1 1 125px}
.vc-admin-filter-row>div:first-child{flex:2 1 220px}
.vc-admin-filter-row label{display:block;font-size:11px;font-weight:750;color:#617387;margin-bottom:5px}
.vc-admin-filter-row input,.vc-admin-filter-row select{border:1px solid var(--vc-border);background:#fff;border-radius:8px;padding:10px 12px;width:100%;max-width:100%;min-height:43px}
.vc-admin-filter-row>a{font-size:12px;color:var(--vc-teal);font-weight:750;padding:10px}
.vc-activity-list{display:grid;gap:0}
.vc-activity-entry{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid #e9eef2;color:var(--vc-navy)}
.vc-activity-entry:hover,.vc-activity-entry:focus-visible{background:#f2f8f8;outline-offset:2px}
.vc-activity-mark{width:9px;height:9px;border-radius:50%;background:var(--vc-teal);flex:0 0 9px}
.vc-activity-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.vc-activity-content strong{font-size:13px;overflow-wrap:anywhere}
.vc-activity-content small{font-size:11px;color:#60758a}
.vc-activity-meta{display:grid;gap:5px;justify-items:end;min-width:95px}
.vc-activity-meta time{font-size:10px;color:#7e8da0;white-space:nowrap}
.vc-status{font-style:normal;background:#eef3f5;border-radius:6px;padding:3px 7px;color:#4f5c6e;font-size:10px;text-transform:capitalize;font-weight:700}
.vc-status-pending{background:#fff0e1;color:#995000}
.vc-status-approved,.vc-status-active{background:#e9f6ef;color:#166b44}
.vc-status-rejected{background:#fcecec;color:#9c3030}
.vc-admin-shortcuts{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:10px}
.vc-admin-shortcuts a{display:block;padding:14px;background:#f3f8f8;border:1px solid #d9e6e8;border-radius:10px;color:var(--vc-teal);font-size:13px;font-weight:750}
.vc-admin-shortcuts a:hover{background:#e8f2f1}
.vc-panel-footnote{color:#748396;font-size:11px;margin-top:13px}
@media(max-width:920px){.vc-admin-banner-content,.vc-admin-toolbar{flex-direction:column;align-items:stretch}.vc-admin-global-search{flex:auto}}
@media(max-width:650px){.vc-admin-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.vc-admin-metric{min-height:138px;padding:12px}.vc-admin-metric b{font-size:1.8rem}.vc-admin-panel{padding:15px}.vc-activity-meta{min-width:0}.vc-panel-header{align-items:flex-start;flex-direction:column}}
@media(max-width:390px){.vc-admin-metrics{grid-template-columns:1fr}}

/* Editor-first dossier and consistent admin reading experience */
.vc-editor-dossier .vc-admin-banner h1{max-width:100%;overflow-wrap:anywhere;word-break:break-word;font-size:clamp(1.65rem,3vw,2.3rem);line-height:1.22}
.vc-editor-dossier .vc-admin-metric{min-height:124px}
.vc-editor-dossier .vc-admin-metric b{font-size:clamp(1rem,2.2vw,1.4rem);overflow-wrap:anywhere}
.vc-editor-alert{border:1px solid #e8b07a;border-inline-start:5px solid #c65f18;background:#fff7ed;padding:18px 21px;border-radius:10px;color:#66330c;margin-bottom:17px}
.vc-editor-alert p{font-size:13px;line-height:1.65;margin:7px 0 0}
.vc-editor-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
.vc-editor-tabs a{border:1px solid #d3e4e9;border-radius:8px;background:#edf6f6;padding:9px 13px;font-size:13px;font-weight:700;color:#0b5761}
.vc-editor-tabs a:hover,.vc-editor-tabs a:focus-visible{border-color:#0a6669}
.vc-editor-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;margin:0}
.vc-editor-field-grid>div{border-bottom:1px solid #ebeff2;padding:11px 0;min-width:0}
.vc-editor-field-grid dt{font-size:11px;font-weight:750;text-transform:capitalize;color:#718094;margin-bottom:5px}
.vc-editor-field-grid dd{font-size:13px;color:#1d3148;line-height:1.5;margin:0;overflow-wrap:anywhere;white-space:pre-wrap}
.vc-editor-note{background:#f5f9fb;border:1px solid #e1eaf0;border-radius:10px;padding:13px 15px;font-size:13px;line-height:1.7;color:#44576d;margin-top:13px;overflow-wrap:anywhere}
.vc-editor-record,.vc-editor-action{border:1px solid #dce6ed;background:#fff;border-radius:11px;padding:16px;margin:12px 0}
.vc-editor-record>summary,.vc-editor-action>summary{cursor:pointer;font-size:15px;font-weight:780;color:var(--vc-navy)}
.vc-editor-record>summary+.vc-editor-field-grid{padding-top:10px}
.vc-editor-record h3,.vc-editor-action h3{font-size:15px;margin:9px 0;color:var(--vc-navy)}
.vc-editor-record p,.vc-editor-action p{font-size:13px;line-height:1.6;color:#607289}
.vc-editor-file-list{display:grid;gap:11px}
.vc-editor-file-list>div{display:flex;flex-direction:column;gap:4px;border:1px solid #dde8ec;border-radius:9px;padding:13px}
.vc-editor-file-list span{font-size:12px;color:#617286}
.vc-editor-file-list a,.vc-dossier-link{color:#075f66;font-weight:750}
.vc-editor-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding-top:14px}
.vc-editor-form>div{min-width:0}
.vc-editor-form label,.vc-editor-decision label{font-size:12px;color:#41556d;font-weight:740;display:block;margin-bottom:5px}
.vc-editor-form input,.vc-editor-decision input:not([type="checkbox"]){width:100%;border:1px solid #d7e2e9;padding:10px 12px;border-radius:8px;font:inherit;min-width:0}
.vc-editor-form-foot{grid-column:1/-1}
.vc-editor-form>button{justify-self:start;grid-column:1/-1}
.vc-editor-decision{display:grid;gap:11px;padding-top:10px}
.vc-editor-buttons{display:flex;flex-wrap:wrap;gap:9px}
.vc-editor-permissions{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px}
.vc-editor-permissions>div{border:1px solid #e0e8ed;padding:12px;border-radius:9px}
.vc-editor-permissions strong{display:block;font-size:13px}
.vc-editor-permissions small{display:block;color:#5a6d7e;margin-bottom:9px}
.vc-editor-permissions label{display:inline-flex;align-items:center;gap:6px;margin-right:14px}
.vc-editor-audit{display:grid;gap:8px}
.vc-editor-audit article{display:flex;flex-direction:column;gap:4px;padding:11px 13px;border:1px solid #e6edf1;border-radius:9px}
.vc-editor-audit span{font-size:11px;color:#66778a}
.vc-editor-audit pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}
.vc-editor-dossier section[id]{scroll-margin-top:95px}
.vc-admin-page .admin-control-content,.vc-admin-page .admin-control-sidebar{min-width:0}
@media(max-width:780px){.vc-editor-form,.vc-editor-field-grid{grid-template-columns:1fr}.vc-editor-dossier .vc-admin-banner{padding:22px 0}.vc-editor-dossier .vc-admin-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:450px){.vc-editor-dossier .vc-admin-metrics{grid-template-columns:1fr}}
@media print{.vc-editor-tabs,.vc-editor-action,.vc-editor-alert{display:none!important}.vc-editor-dossier .vc-admin-panel{break-inside:avoid}}

/* Each qualification stays paired with its awarding institution. */
.vc-education { min-width: 0; margin: 10px 0 20px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: #fffdf9; }
.vc-education legend { padding: 0 7px; font-weight: 750; color: var(--navy); font-size: 14px; }
.vc-education > .form-help { margin: 0 0 14px; }
.vc-education-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) auto; gap: 14px; align-items: start; padding: 14px 0; border-top: 1px solid var(--line); }
.vc-education-row--primary { grid-template-columns: repeat(2,minmax(0,1fr)); padding-top: 0; border-top: 0; }
.vc-education-row > div { min-width: 0; }
.vc-education-row input, .vc-education-row select { width: 100%; min-width: 0; }
.vc-institution-field small { display: block; overflow-wrap: anywhere; }
.vc-institution-field a { color: var(--navy); text-decoration: underline; }
.vc-degree-remove { align-self: start; margin-top: 23px; min-height: 44px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 9px; background: #fff; color: var(--navy); cursor: pointer; font: inherit; font-size: 12px; }
.vc-degree-add { min-height: 44px; margin: 6px 0 2px; }
.vc-pvmc-row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 14px; align-items: center; border-top: 1px solid var(--line); margin-top: 16px; padding-top: 14px; }
.vc-pvmc-row .checkbox-line { min-height: 44px; margin: 20px 0 0; }
@media (max-width: 640px) {
  .vc-education { padding: 12px; }
  .vc-education-row, .vc-education-row--primary, .vc-pvmc-row { grid-template-columns: minmax(0,1fr); gap: 0; }
  .vc-degree-remove { justify-self: end; margin: 0 0 10px; }
  .vc-pvmc-row .checkbox-line { margin: 0; }
}

/* Professional builder: one centered workspace with six persistent form panels. */
.professional-builder-page .dashboard-hero { padding-block: 32px; }
.professional-builder-page .dashboard-hero h1 { font-size: clamp(26px, 3vw, 38px); line-height: 1.18; max-width: 700px; }
.professional-builder-page .dashboard-hero-row { gap: 24px; }
.professional-builder-page .dashboard-actions { flex-wrap: wrap; }
.professional-builder-page .shell { max-width: 1180px; }
.profile-builder { display: grid; grid-template-columns: 238px minmax(0, 1fr); gap: 24px; align-items: start; margin-top: 18px; }
.builder-sidebar { position: sticky; top: 24px; border: 1px solid var(--line); border-radius: 16px; background: #fff; overflow: hidden; }
.builder-progress { padding: 20px; border-bottom: 1px solid var(--line); }
.builder-progress strong { display: block; margin: 8px 0; color: var(--navy); font-size: 15px; }
.builder-progress progress { width: 100%; height: 8px; accent-color: #f58200; }
.builder-progress p { margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.55; }
.builder-step-list { display: grid; padding: 8px; gap: 4px; }
.builder-step { display: flex; align-items: center; gap: 10px; width: 100%; border: 1px solid transparent; border-radius: 10px; padding: 12px 10px; background: transparent; text-align: left; cursor: pointer; color: var(--navy); min-height: 60px; }
.builder-step.is-active { background: #fff5e9; border-color: #ffd6a6; }
.builder-step b { display: block; font-size: 14px; }
.builder-step small { display: block; margin-top: 3px; font-size: 11px; color: var(--muted); line-height: 1.4; }
.builder-step-number { display: grid; place-items: center; flex: 0 0 28px; height: 28px; background: #eff3fa; border-radius: 50%; font-size: 12px; font-weight: 800; }
.builder-step-number.is-saved { background: #e6f5ed; color: #136341; }
.builder-step:focus-visible,.builder-main:focus-visible { outline: 3px solid #3266ac; outline-offset: 3px; }
.builder-main,.builder-panel { min-width: 0; }
.builder-main { scroll-margin-top: 20px; }
.builder-section-bar { padding: 0 0 18px; }
.builder-section-bar > span { color: #bb5c00; font-size: 11px; font-weight: 800; letter-spacing: .1em; }
.builder-section-bar > strong { display: block; color: var(--navy); font-size: 22px; margin: 5px 0; }
.builder-section-bar p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
.builder-panel[hidden] { display: none; }
.profile-builder .workspace-section-card { margin: 0; }
.profile-builder .section-heading { margin-bottom: 20px; }
.profile-builder .section-heading h2 { font-size: clamp(22px, 2.5vw, 29px); line-height: 1.22; letter-spacing: -.025em; }
.profile-builder .professional-workspace-overview { grid-template-columns: 1fr; margin: 0; }
.profile-builder .professional-photo-card { gap: 20px; }
.profile-builder .professional-photo-card h2 { font-size: 22px; overflow-wrap: anywhere; }
.profile-builder .professional-photo-large { width: 96px; height: 96px; min-width: 96px; }
.profile-builder .backend-form-card { padding: 24px; box-shadow: 0 5px 20px #10224708; }
.profile-builder .form-grid { gap: 16px; }
.profile-builder input:not([type="checkbox"]),.profile-builder select,.profile-builder textarea { width: 100%; min-width: 0; font-size: 16px; min-height: 46px; }
.profile-builder input[type="file"] { white-space: normal; padding: 10px; }
.profile-builder textarea { min-height: 120px; resize: vertical; }
.profile-builder .checkbox-line { display: flex; flex-direction: row; align-items: center; gap: 10px; min-height: 44px; }
.profile-builder .checkbox-line input { width: 18px; height: 18px; flex: 0 0 18px; margin: 0; }
.profile-builder .workspace-record-list > article { flex-wrap: wrap; overflow-wrap: anywhere; }
.profile-builder .workspace-record-list > article > div:first-child { min-width: 0; flex: 1 1 220px; }
.profile-builder .form-help { font-size: 12px; }
.builder-navigation { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 20px 0; }
.builder-navigation > span { color: var(--muted); font-size: 12px; }
.builder-navigation .button { min-height: 44px; }
.builder-navigation button:disabled { opacity: .4; cursor: default; }
.builder-career-links { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
.builder-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
@media (max-width: 900px) {
 .profile-builder { grid-template-columns: 1fr; gap: 20px; }
 .builder-sidebar { position: static; }
 .builder-progress { padding: 16px; }
 .builder-progress p { max-width: 650px; }
 .builder-step-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
 .builder-step { min-width: 0; }
 .builder-step small { display: none; }
}
@media (max-width: 600px) {
 .professional-builder-page .shell { width: calc(100% - 28px); }
 .professional-builder-page .dashboard-hero { padding-block: 24px; }
 .professional-builder-page .dashboard-hero-row { flex-direction: column; align-items: flex-start; }
 .professional-builder-page .dashboard-actions { display: flex; width: 100%; gap: 8px; }
 .professional-builder-page .dashboard-actions .button { flex: 1 1 140px; text-align: center; min-height: 44px; padding: 12px; }
 .builder-step-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
 .builder-step { padding: 10px 8px; min-height: 48px; }
 .builder-step b { font-size: 12px; }
 .builder-step-number { flex-basis: 24px; height: 24px; }
 .profile-builder .backend-form-card { padding: 18px; border-radius: 14px; }
 .profile-builder .form-grid { grid-template-columns: minmax(0,1fr); }
 .profile-builder .professional-photo-card { align-items: flex-start; padding: 18px; gap: 14px; }
 .profile-builder .professional-photo-large { width: 72px; height: 72px; min-width: 72px; }
 .profile-builder .professional-photo-card h2 { font-size: 18px; }
 .builder-navigation .button { flex: 1 1 120px; padding: 12px; font-size: 12px; text-align: center; }
 .builder-navigation > span { display: none; }
 .builder-career-links .button { width: 100%; text-align: center; }
}

.workspace-tool-navigation { border-block: 1px solid var(--line); background: #fff; }
.workspace-tool-navigation > .shell { display: flex; align-items: center; gap: 24px; padding-block: 12px; max-width: 1180px; }
.workspace-tool-title { flex-shrink: 0; font-size: 13px; font-weight: 800; color: var(--navy); }
.workspace-tool-links { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.workspace-tool-links a { display: inline-flex; align-items: center; padding: 10px 14px; min-height: 44px; border-radius: 8px; font-size: 13px; color: var(--navy); text-decoration: none; }
.workspace-tool-links a[aria-current="page"] { background: #fff1de; color: #984600; font-weight: 800; }
.workspace-tool-links a:focus-visible { outline: 3px solid #3266ac; outline-offset: 2px; }
.builder-saving-help { color: var(--muted); font-size: 12px; margin-bottom: 14px; }
.builder-saving-help summary { cursor: pointer; min-height: 30px; }
.builder-saving-help p { max-width: 620px; line-height: 1.6; }
@media(max-width:600px) {
 .workspace-tool-navigation > .shell { display: block; width: calc(100% - 28px); padding-block: 10px; }
 .workspace-tool-title { display: block; margin-bottom: 6px; }
 .workspace-tool-links { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
 .workspace-tool-links a { padding: 10px; font-size: 12px; }
}

.builder-mobile-selector { display: none; }
@media(max-width:600px) {
 .profile-builder .builder-step-list { display: none; }
 .builder-mobile-selector { display: grid; padding: 14px 16px; gap: 8px; font-size: 12px; font-weight: 700; color: var(--navy); }
 .builder-mobile-selector select { width: 100%; min-height: 46px; font-size: 16px; }
}

/* One person, one profile: task-led entry and a focused CV composer. */
.profile-home-shell,.cv-focused-shell { max-width: 920px; }
.personal-identity-card { display: flex; align-items: center; gap: 24px; border: 1px solid var(--line); background: #fff; border-radius: 16px; padding: 26px; }
.personal-identity-card h1 { font-size: clamp(24px,3vw,34px); line-height: 1.2; margin: 8px 0; overflow-wrap: anywhere; }
.personal-identity-card p { margin: 6px 0; color: var(--muted); }
.personal-identity-photo { width: 96px; height: 108px; flex: 0 0 96px; border-radius: 12px; overflow: hidden; }
.personal-identity-photo .profile-photo { width: 100%; height: 100%; object-fit: cover; }
.profile-start { margin-block: 32px; }
.profile-start h2 { font-size: 24px; margin-bottom: 10px; }
.profile-start > p,.profile-home-note { font-size: 14px; line-height: 1.7; color: var(--muted); }
.profile-start-choices { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; margin-top: 20px; }
.profile-start-choices > button { padding: 22px; text-align: left; background: #fff; border: 1px solid var(--line); border-radius: 14px; color: var(--navy); cursor: pointer; }
.profile-start-choices > button.is-selected { border-color: #f58200; background: #fff7ed; }
.profile-start-choices b { display: block; font-size: 17px; margin-bottom: 9px; }
.profile-start-choices span { display: block; font-size: 13px; line-height: 1.6; color: var(--muted); }
.profile-task-panel { margin-top: 16px; padding: 24px; background: #fff; border: 1px solid var(--line); border-radius: 14px; }
.profile-task-panel h3 { margin-top: 0; font-size: 20px; }
.profile-task-panel p { font-size: 14px; color: var(--muted); line-height: 1.7; }
.profile-task-links { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
.connection-records { padding: 0; list-style: none; display: grid; gap: 12px; }
.connection-records li { padding: 16px; border: 1px solid var(--line); border-radius: 10px; }
.connection-records span { display: block; margin-top: 6px; font-size: 13px; color: var(--muted); }
.cv-mode-choice { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.cv-mode-choice a { padding: 12px 16px; background: #fff; border: 1px solid var(--line); border-radius: 10px; font-size: 14px; }
.cv-mode-choice a[aria-current="page"] { border-color: #f58200; background: #fff5e7; font-weight: 700; }
.cv-composer-progress { display: grid; gap: 8px; margin-bottom: 24px; }
.cv-composer-progress > span { font-size: 11px; letter-spacing: .1em; color: #995000; font-weight: 800; }
.cv-composer-progress > strong { font-size: 24px; color: var(--navy); }
.cv-composer-progress progress { width: 100%; height: 7px; accent-color: #f58200; }
.cv-composer .profile-form { display: block; }
.cv-composer fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.cv-composer fieldset[hidden] { display: none; }
.cv-composer legend { font-size: 18px; font-weight: 800; margin-bottom: 10px; }
.cv-composer fieldset > p { font-size: 14px; line-height: 1.7; color: var(--muted); }
.cv-composer .form-grid { gap: 16px; }
.cv-composer input,.cv-composer textarea { width: 100%; min-width: 0; font-size: 16px; }
.cv-composer-actions,.cv-next-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-top: 24px; }
.cv-photo-disclosure { padding: 14px; margin-bottom: 20px; border: 1px solid var(--line); border-radius: 10px; }
.cv-photo-disclosure summary { cursor: pointer; font-size: 14px; }
.cv-photo-disclosure form { display: grid; gap: 12px; margin-top: 16px; }
.vetconnect-cv { background: #fff; color: #17243b; padding: 32px; font-family: Arial,sans-serif; overflow-wrap: anywhere; }
.cv-letterhead { display: flex; justify-content: space-between; align-items: center; gap: 18px; border-bottom: 2px solid #f58200; padding-bottom: 16px; }
.cv-letterhead > span { font-size: 10px; letter-spacing: .12em; color: #53617b; }
.cv-person-heading { display: flex; justify-content: space-between; gap: 24px; padding: 26px 0; border-bottom: 1px solid #dce2eb; }
.cv-person-heading > div { min-width: 0; }
.vetconnect-cv .cv-person-heading h1 { font-size: 30px; letter-spacing: -.02em; margin: 0 0 8px; }
.cv-person-heading p { font-size: 12px; margin: 6px 0; }
.cv-person-heading .cv-profession { font-size: 16px; font-weight: 700; }
.cv-person-photo { flex-shrink: 0; width: 100px; height: 116px; object-fit: cover; border-radius: 4px; }
.cv-document-section { margin-top: 24px; }
.cv-document-section h2 { font-size: 16px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #dce2eb; }
.cv-document-section p { white-space: pre-wrap; font-size: 13px; line-height: 1.75; margin: 0; }
.cv-provenance { border-top: 1px solid #dce2eb; margin-top: 30px; padding-top: 12px; font-size: 9px; color: #6a7486; line-height: 1.6; }
.cv-print-page { max-width: 820px; margin: 30px auto; padding: 16px; }
@media(max-width:640px) {
 .profile-start-choices { grid-template-columns: minmax(0,1fr); }
 .personal-identity-card { padding: 18px; gap: 14px; align-items: flex-start; }
 .personal-identity-photo { width: 64px; height: 76px; flex-basis: 64px; }
 .profile-task-links { align-items: stretch; flex-direction: column; }
 .cv-composer .form-grid { grid-template-columns: minmax(0,1fr); }
 .cv-focused-shell > .backend-form-card { padding: 18px; }
 .vetconnect-cv { padding: 16px; }
 .vetconnect-cv .cv-person-heading h1 { font-size: 22px; }
 .cv-person-heading { gap: 12px; }
 .cv-person-photo { width: 70px; height: 84px; }
 .cv-letterhead > span { font-size: 8px; }
 .cv-mode-choice a { flex: 1 1 160px; text-align: center; }
}
@media print {
 @page { size: A4; margin: 16mm; }
 .cv-print-page { padding: 0; margin: 0; max-width: none; }
 .vetconnect-cv { padding: 0; }
 .cv-person-heading,.cv-letterhead,.cv-document-section h2 { break-inside: avoid; }
 .cv-document-section h2 { break-after: avoid; }
 .vetconnect-cv { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.workspace-tool-menu { width: 100%; }
.workspace-tool-menu > summary { cursor: pointer; padding: 10px 0; min-height: 44px; color: var(--navy); font-size: 14px; font-weight: 800; }
.workspace-tool-menu > summary span { margin-left: 12px; color: var(--muted); font-size: 13px; font-weight: 400; }
.workspace-tool-menu .workspace-tool-links { padding: 8px 0 4px; }
.professional-builder-page .builder-sidebar { top: 100px; }
@media(max-width:900px) { .professional-builder-page .builder-sidebar { top: auto; } }


/* Professional workspace: restrained visual hierarchy and a privacy-preserving photo studio. */
.professional-builder-page { background: #f6f8fc; }
.professional-builder-page .dashboard-hero { background: linear-gradient(116deg,#0b1c40 0%,#19386e 100%); }
.professional-builder-page .builder-sidebar {
  border-color: #e1e7f0;
  box-shadow: 0 12px 30px rgba(14,37,76,.045);
}
.professional-builder-page .builder-step {
  transition: background-color .15s ease, border-color .15s ease;
}
.professional-builder-page .builder-step.is-active {
  border-color:#ffcf99;
  box-shadow:inset 3px 0 0 #f58200;
}
.professional-builder-page .builder-section-bar {
  margin-bottom:12px;
  border-bottom:1px solid #e5eaf2;
}
.professional-builder-page .builder-main > .builder-panel > .backend-form-card {
  border:1px solid #e1e7f0;
  border-radius:16px;
}
.photo-studio {
  display:grid;
  grid-template-columns:minmax(170px,210px) minmax(0,1fr);
  align-items:start;
  gap:26px;
  min-width:0;
}
.photo-studio-frame {
  border-radius:14px;
  background:#f1f4f9;
  border:1px solid #e2e8f1;
  padding:13px;
  display:grid;
  place-items:center;
}
.photo-studio-frame canvas,.photo-studio-placeholder {
  display:block;
  width:100%;
  max-width:190px;
  aspect-ratio:4/5;
  height:auto;
  border-radius:10px;
  border:4px solid #fff;
  box-shadow:0 7px 22px rgba(13,32,68,.12);
  background:#e6edf6;
}
.photo-studio-placeholder {
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  gap:8px;
  text-align:center;
  color:#61718b;
}
.photo-studio-placeholder span {font-size:32px;color:#f58200;line-height:1;}
.photo-studio-placeholder strong{font-size:12px;color:#243c63;}
.photo-studio-placeholder small{font-size:10px;}
.photo-studio-controls {display:grid;gap:12px;min-width:0;}
.photo-studio-controls h3 {margin:0;font-size:21px;line-height:1.3;color:#10244c;}
.photo-studio-controls > p {color:#617087;font-size:13px;line-height:1.65;margin:0;}
.photo-studio-controls > label:not(.photo-studio-check),.photo-studio-adjustments label,.photo-studio-label {
  display:block;font-size:12px;color:#283b59;font-weight:700;
}
.photo-studio-check {display:flex;align-items:center;gap:9px;font-size:13px;color:#2e4468;}
.photo-studio-check input {flex:0 0 18px;width:18px;height:18px;}
.photo-studio-adjustments {display:grid;gap:9px;}
.photo-studio-adjustments input[type="range"]{width:100%;min-height:26px;accent-color:#f58200;}
.photo-studio-swatches {display:flex;gap:12px;padding:7px 3px;}
.photo-studio-swatches button {
  width:32px;height:32px;border-radius:50%;border:2px solid #fff;
  box-shadow:0 0 0 1px #c5cfde;cursor:pointer;
}
.photo-studio-swatches button[aria-pressed="true"]{box-shadow:0 0 0 3px #f58200;}
.photo-studio-swatches button:focus-visible{outline:3px solid #3159a3;outline-offset:3px;}
.photo-studio-error {color:#a6272b!important;font-weight:700;}
.photo-studio-controls > .button {width:100%;min-height:46px;margin-top:2px;}
@media(max-width:780px) {
 .photo-studio {grid-template-columns:1fr;gap:18px;}
 .photo-studio-frame {max-width:280px;width:100%;margin:0 auto;}
 .professional-builder-page .dashboard-hero h1{font-size:clamp(24px,6vw,32px);}
}
@media(prefers-reduced-motion:reduce){
 .professional-builder-page .builder-step{transition:none;}
}


/* Job and internship preferences: one short, searchable choice at a time. */
.career-interests-page { background:#f7f9fc; }
.career-interests-shell { max-width:890px!important; }
.career-interests-page .page-hero h1 { max-width:720px; }
.career-interests-form { display:grid;gap:18px; }
.career-interests-section { padding:28px; border-radius:16px; box-shadow:0 8px 30px rgba(16,38,76,.045); }
.career-interests-section h2 { margin:8px 0; font-size:clamp(22px,3vw,27px); color:#10244c; }
.career-interests-section > p { color:#607087; font-size:14px; line-height:1.65; margin-bottom:24px; }
.career-interests-section > div, .career-interests-section > label { margin-block:15px; }
.career-interests-section label:not(.checkbox-line) { display:block; font-size:13px; color:#263e62; font-weight:700; margin-bottom:7px; }
.career-interests-section input:not([type="checkbox"]),.career-interests-section select { min-height:46px; width:100%;min-width:0;font-size:16px; }
.career-choice-field { min-width:0; }
.career-choice-entry { display:flex;align-items:stretch;gap:8px;min-width:0; }
.career-choice-entry input {flex:1 1 auto;min-width:0;}
.career-choice-entry .button { flex:0 0 auto;min-height:46px; }
.career-choice-tags { display:flex;flex-wrap:wrap;gap:7px;list-style:none;padding:0;margin:9px 0 12px; }
.career-choice-tags li { display:inline-flex;max-width:100%;align-items:center;border:1px solid #d6e0ee;border-radius:18px;background:#eef4fb;color:#19365f;font-size:12px;overflow-wrap:anywhere; }
.career-choice-tags li span { padding:8px 4px 8px 12px;min-width:0; }
.career-choice-tags li button { align-self:stretch;min-width:36px;border:0;background:transparent;color:#304e7b;cursor:pointer;font-size:21px; }
.career-choice-tags li button:focus-visible {outline:3px solid #3159a3;outline-offset:-3px;}
.career-choice-suggestions { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
.career-choice-suggestions button { border:1px solid #e1e7ee;background:#fff;border-radius:20px;padding:7px 11px;font-size:12px;color:#19365f;cursor:pointer;min-height:38px;text-align:left; }
.career-choice-suggestions button span {font-weight:800;color:#b95f09;margin-left:7px;}
.career-choice-suggestions button:hover,.career-choice-suggestions button:focus-visible {border-color:#f58200;outline-offset:2px;}
.career-interests-two-column { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px; }
.career-interests-actions {display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.career-interests-actions .button {min-height:48px;}
.career-optional-disclosure {padding:16px 18px;border-radius:12px;border:1px solid #dce4ef;}
.career-optional-disclosure summary {font-weight:700;color:#1c365e;cursor:pointer;}
.career-optional-disclosure[open] summary {margin-bottom:16px;}
.career-interests-section .checkbox-line {display:flex;align-items:flex-start;gap:10px;min-height:42px;font-size:13px;line-height:1.55;}
.career-interests-section .checkbox-line input {width:18px;height:18px;flex:0 0 18px;margin:3px 0;}
.cv-skill-selector {display:grid;gap:8px;padding:14px;margin-top:14px;border:1px solid #e1e7f0;background:#f8faff;border-radius:12px;}
.cv-skill-selector > div,.professional-skills-pick {display:flex;gap:9px;align-items:stretch;min-width:0;}
.cv-skill-selector select,.professional-skills-pick select{flex:1 1 auto;min-width:0;}
.cv-skill-selector button,.professional-skills-pick button {min-height:44px;flex:0 0 auto;}
.professional-skills-edit {display:grid;gap:8px;}
.career-profile-interest-link {padding:15px 18px;border:1px solid #e1e7f0;background:#f7f9fd;border-radius:10px;color:#253f61;}
.career-profile-interest-link strong{font-size:14px;}
.career-profile-interest-link p{font-size:13px;line-height:1.6;color:#617087;margin:7px 0;}
.career-profile-interest-link a{font-size:13px;font-weight:700;}
@media(max-width:600px){
 .career-interests-section {padding:20px 16px;}
 .career-interests-two-column {grid-template-columns:1fr;}
 .career-choice-entry .button {padding-inline:14px;}
 .career-interests-actions .button {flex:1 1 130px;text-align:center;}
 .cv-skill-selector > div,.professional-skills-pick{flex-wrap:wrap;}
 .cv-skill-selector button,.professional-skills-pick button{flex:1 1 100%; }
}


/* Admin Control v2: one navigation + one task-first content area. */
.vc-admin-page .vc-admin-layout{display:grid;grid-template-columns:230px minmax(0,1fr);align-items:start;gap:22px}
.vc-admin-page .admin-control-sidebar{min-width:0}
.vc-admin-page .admin-navigation{top:94px;max-height:calc(100vh - 108px);overflow-y:auto}
.vc-admin-page .vc-admin-main{min-width:0}
.vc-admin-page .vc-admin-toolbar{margin:0 0 14px;align-items:center}
.vc-admin-page .vc-admin-toolbar h1{font-size:clamp(1.6rem,2.6vw,2.15rem);color:#102451;letter-spacing:-.025em;margin:4px 0}
.vc-admin-page .vc-admin-toolbar p{font-size:12px;line-height:1.65;max-width:64ch}
.vc-admin-page .vc-admin-toolbar-search{border:1px solid #e2e8f0;background:#fff;border-radius:13px;padding:12px 16px;gap:15px;margin-bottom:20px}
.vc-admin-page .vc-admin-toolbar-search>p{margin:0}
.vc-admin-page .vc-admin-toolbar-search .vc-admin-global-search{flex:0 1 370px}
.vc-admin-page .vc-admin-priority-panel{background:#fff;border:1px solid #e0e7f0;border-radius:16px;padding:21px;margin:0 0 20px}
.vc-admin-page .vc-admin-section-title{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:17px}
.vc-admin-page .vc-admin-section-title h2{font-size:clamp(1.2rem,1.8vw,1.55rem);color:#102451;margin:4px 0}
.vc-admin-page .vc-admin-section-title p{font-size:12px;color:#62758b;margin:0}
.vc-admin-page .vc-admin-section-title>a{color:#ae5905;font-size:12px;font-weight:750;white-space:nowrap}
.vc-admin-page .vc-admin-priority-grid{grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:9px;margin:0}
.vc-admin-page .vc-admin-priority-grid .vc-admin-metric{min-height:120px;padding:13px;border-left:3px solid #ed881f;box-shadow:none}
.vc-admin-page .vc-admin-priority-grid .vc-admin-metric b{font-size:1.7rem}
.vc-admin-page .vc-admin-priority-grid .vc-admin-metric>span:last-child{font-size:11px}
.vc-admin-page .vc-admin-overview-details{padding:0;overflow:hidden}
.vc-admin-page .vc-admin-overview-details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 21px}
.vc-admin-page .vc-admin-overview-details>summary::-webkit-details-marker{display:none}
.vc-admin-page .vc-admin-overview-details>summary strong{font-size:15px;color:#142c54}
.vc-admin-page .vc-admin-overview-details>summary span{font-size:11px;color:#66778c}
.vc-admin-page .vc-admin-overview-details>summary::after{content:"+";font-size:20px;color:#ac5d0a;font-weight:800}
.vc-admin-page .vc-admin-overview-details[open]>summary::after{content:"−"}
.vc-admin-page .vc-admin-overview-details[open]>summary{background:#f6f9fc;border-bottom:1px solid #e3e9f0}
.vc-admin-page .vc-admin-overview-details .vc-admin-metrics{padding:17px;margin:0}
.vc-admin-page .vc-admin-overview-details .vc-admin-metric{min-height:115px;box-shadow:none}
.vc-admin-page .vc-admin-overview-details>summary:focus-visible{outline:3px solid #d97f17;outline-offset:-3px}
.vc-admin-page .admin-navigation .vc-admin-section a{overflow-wrap:anywhere}
@media(max-width:920px){
 .vc-admin-page .vc-admin-layout{grid-template-columns:minmax(0,1fr)}
 .vc-admin-page .admin-navigation{position:static;max-height:none;overflow:visible}
 .vc-admin-page .vc-admin-toolbar-search{flex-direction:column;align-items:stretch}
 .vc-admin-page .vc-admin-toolbar-search .vc-admin-global-search{flex:auto}
}
@media(max-width:600px){
 .vc-admin-page .vc-admin-toolbar{align-items:stretch;flex-direction:column}
 .vc-admin-page .vc-admin-actions{width:100%}
 .vc-admin-page .vc-admin-actions .button{flex:1}
 .vc-admin-page .vc-admin-priority-panel{padding:15px}
 .vc-admin-page .vc-admin-section-title{align-items:start;flex-direction:column}
 .vc-admin-page .vc-admin-priority-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 .vc-admin-page .vc-admin-overview-details>summary{flex-wrap:wrap;padding:15px}
 .vc-admin-page .vc-admin-overview-details>summary span{flex:1 1 100%}
 .vc-admin-page .vc-admin-overview-details .vc-admin-metrics{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}
}
@media(max-width:370px){
 .vc-admin-page .vc-admin-priority-grid,.vc-admin-page .vc-admin-overview-details .vc-admin-metrics{grid-template-columns:1fr}
}


/* Admin v2 board figures: key operational counts remain in view. */
.vc-admin-page .vc-admin-sector-summary{background:#fff;border:1px solid #dfe7f0;border-radius:16px;padding:20px;margin:0 0 19px}
.vc-admin-page .vc-admin-top-figures{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:17px}
.vc-admin-page .vc-admin-top-figures>a{min-width:0;border:1px solid #e0e8f2;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;text-decoration:none;background:#f8faff;color:#142b50}
.vc-admin-page .vc-admin-top-figures>a:hover,.vc-admin-page .vc-admin-top-figures>a:focus-visible{border-color:#de7907;background:#fff5e9}
.vc-admin-page .vc-admin-top-figures span{font-size:11px;color:#566d88;font-weight:750}
.vc-admin-page .vc-admin-top-figures strong{font-size:24px;line-height:1.1}
.vc-admin-page .vc-admin-top-figures small{font-size:10px;color:#728198}
.vc-admin-page .vc-admin-sector-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.vc-admin-page .vc-admin-sector-card{min-width:0;border:1px solid #e1e8f1;border-radius:13px;padding:15px;background:#fff}
.vc-admin-page .vc-admin-sector-card-top{display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:7px}
.vc-admin-page .vc-admin-sector-card h3{margin:0;font-size:14px;line-height:1.4;color:#152e54}
.vc-admin-page .vc-admin-sector-card-top>a{font-size:11px;color:#a65a0a;font-weight:800}
.vc-admin-page .vc-admin-sector-total{display:flex;align-items:baseline;gap:9px;margin:10px 0 12px}
.vc-admin-page .vc-admin-sector-total strong{font-size:25px;line-height:1.05;color:#11254e}
.vc-admin-page .vc-admin-sector-total span{font-size:11px;color:#687b8e}
.vc-admin-page .vc-admin-sector-states{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.vc-admin-page .vc-admin-sector-states>div{border-radius:9px;padding:8px 5px;background:#f5f7fa;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px}
.vc-admin-page .vc-admin-sector-states span{font-size:10px;color:#64748b;text-align:center;white-space:normal}
.vc-admin-page .vc-admin-sector-states b{font-size:16px;color:#1e365d}
.vc-admin-page .vc-admin-sector-states>div:nth-child(2){background:#fff3e8}
.vc-admin-page .vc-admin-sector-states>div:nth-child(2) b{color:#a95100}
.vc-admin-page .vc-admin-sector-note{font-size:10.5px;color:#728198;line-height:1.55;margin:10px 0 0}
.vc-admin-page .vc-admin-sector-summary>.vc-panel-footnote{margin:16px 0 0}
@media(max-width:1100px){.vc-admin-page .vc-admin-top-figures{grid-template-columns:repeat(2,minmax(0,1fr))}.vc-admin-page .vc-admin-sector-grid{grid-template-columns:1fr}}
@media(max-width:520px){.vc-admin-page .vc-admin-sector-summary{padding:14px}.vc-admin-page .vc-admin-sector-states{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* Public veterinary clinic rate card */
.vc-public-rates{display:grid;gap:10px;margin-top:16px}
.vc-public-rate{background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:15px;box-shadow:0 4px 14px rgba(22,46,79,.03)}
.vc-public-rate-title{display:flex;gap:12px;align-items:start;justify-content:space-between;flex-wrap:wrap}
.vc-public-rate-title h4{font-size:15px;line-height:1.4;margin:0;color:#19325a}
.vc-public-rate-title strong{white-space:nowrap;font-size:15px;color:#b35b09}
.vc-public-rate>p{font-size:12px;line-height:1.5;color:#5f7288;margin:8px 0}


/* VetConnect job artwork: one no-crop 4:5 visual frame for every original poster.
   Original bytes are stored unchanged and remain accessible on the job detail. */
.job-poster-thumbnail {
  --job-poster-width: 116px;
  position: relative;
  display: flex;
  flex: none;
  width: var(--job-poster-width);
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #dce4ee;
  background: #f2f5f9;
  box-shadow: 0 2px 7px rgba(12, 30, 64, 0.07);
  isolation: isolate;
}
.job-poster-thumbnail__image {
  object-fit: contain !important;
  object-position: center center;
  background: #f2f5f9;
}
.job-poster-thumbnail__fallback {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 9px;
  color: #25375a;
  font-size: 0.62rem;
  font-weight: 800;
  text-align: center;
  letter-spacing: .05em;
}
.job-poster-thumbnail__mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #10214a;
  color: #fff;
  font-weight: 800;
  font-size: .8rem;
  letter-spacing: 0;
}
.job-poster-thumbnail:hover,
.job-poster-thumbnail:focus-visible {
  border-color: var(--orange);
  outline-offset: 3px;
}
.job-board article {
  grid-template-columns: 116px minmax(0, 1fr) auto;
  align-items: center;
}
.job-board .job-main,
.job-board .job-apply { min-width: 0; }
.current-job-slide .job-poster-thumbnail--compact {
  --job-poster-width: 116px;
  margin-bottom: 12px;
}
.current-job-slide h3 { margin-top: 8px; }
@media (min-width: 641px) and (max-width: 900px) {
  .job-board article { grid-template-columns: 96px minmax(0, 1fr); }
  .job-board .job-poster-thumbnail { --job-poster-width: 96px; }
  .job-board .job-apply { grid-column: 2; }
}
@media (max-width: 640px) {
  .job-board article {
    grid-template-columns: 86px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
  }
  .job-board .job-poster-thumbnail { --job-poster-width: 86px; }
  .job-board .job-apply { grid-column: 2; }
  .current-job-slide .job-poster-thumbnail--compact { --job-poster-width: 100px; }
}

.vcx-appointment-calendar { margin-block: 1rem; }
.vcx-appointment-calendar-controls { display: flex; flex-wrap: wrap; gap: .5rem; }
.vcx-appointment-calendar-controls button {
  border: 1px solid currentColor;
  border-radius: .4rem;
  padding: .4rem .65rem;
}
.vcx-appointment-calendar-controls [aria-pressed="true"] { font-weight: 700; }
.vcx-appointment-weekdays,
.vcx-appointment-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: .25rem;
}
.vcx-appointment-days { list-style: none; margin: 0; padding: 0; }
.vcx-appointment-days li { border: 1px solid #cbd5e1; border-radius: .3rem; padding: .25rem; }
.vcx-appointment-days .is-today { border-color: #c2410c; }
.vcx-appointment-days time { display: block; font-weight: 700; }
.vcx-appointment-days a { display: block; font-size: .8rem; overflow-wrap: anywhere; text-decoration: underline; }
@media (max-width: 640px) {
  .vcx-appointment-weekdays { display: none; }
  .vcx-appointment-days { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vcx-appointment-days time::after { content: " · " attr(aria-label); font-size: .75rem; }
}
