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
import {
  initials,
  sampleClinics,
  type PublicClinic,
} from "@/lib/directories";
import { requestClinicMembershipAction } from "../../dashboard/clinics/actions";
import { requestClinicAppointmentAction } from "../actions";

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

type ServiceCatalog = {
  id: string;
  service_name: string;
  category: string;
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

type PublicMemberRow = {
  professional_user_id: string;
  designation: string | null;
  is_primary: boolean;
};

type PublicProfessionalBrief = {
  user_id: string | null;
  slug: string;
  full_name: string;
  professional_type: string;
  headline: string | null;
  current_position: string | null;
  image_url: string | null;
};

type PublicTeamMember = PublicMemberRow & {
  slug?: string;
  full_name?: string;
  professional_type?: string;
  headline?: string | null;
  current_position?: string | null;
  image_url?: string | null;
};

type ClinicPageData = {
  clinic: PublicClinic;
  services: Array<
    ClinicService & {
      service_name?: string;
      category?: string;
    }
  >;
  availability: AvailabilityRow[];
  team: PublicTeamMember[];
};

function scheduleLabel(row: AvailabilityRow) {
  if (!row.is_open) return "Closed";
  if (row.is_24_hours) {
    return row.appointment_enabled
      ? "Open 24 hours · appointments accepted"
      : "Open 24 hours";
  }

  const hours = `${row.opens_at?.slice(0, 5) || ""}–${row.closes_at?.slice(0, 5) || ""}`;
  const breakLabel =
    row.break_start && row.break_end
      ? ` · break ${row.break_start.slice(0, 5)}–${row.break_end.slice(0, 5)}`
      : "";
  const bookingLabel = row.appointment_enabled
    ? ` · appointments every ${row.slot_minutes} min`
    : "";

  return `${hours}${breakLabel}${bookingLabel}`;
}

function pakistanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

async function loadClinic(
  slug: string,
): Promise<ClinicPageData | null> {
  const sample = sampleClinics.find(
    (item) => item.slug === slug,
  );
  if (!isSupabaseConfigured()) {
    return sample
      ? {
          clinic: sample,
          services: [],
          availability: [],
          team: [],
        }
      : null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("public_clinics")
    .select(
      "id, slug, clinic_name, facility_type, description, city, province, district, tehsil, logo_url, cover_image_url, address, public_phone, public_email, website, working_hours, emergency_service, services, species, profile_verified",
    )
    .eq("slug", slug)
    .maybeSingle();

  const clinic =
    (data as PublicClinic | null) ?? sample ?? null;
  if (!clinic) return null;

  if (!clinic.id || clinic.is_sample) {
    return {
      clinic,
      services: [],
      availability: [],
      team: [],
    };
  }

  const [
    { data: serviceRows },
    { data: catalogRows },
    { data: availabilityRows },
    { data: memberRows },
  ] = await Promise.all([
    supabase
      .from("clinic_services")
      .select(
        "id, service_id, description, fee_min, fee_max, currency, duration_minutes, booking_enabled",
      )
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .eq("is_public", true),
    supabase
      .from("service_catalog")
      .select("id, service_name, category")
      .eq("is_active", true),
    supabase
      .from("clinic_availability")
      .select(
        "day_of_week, is_open, is_24_hours, opens_at, closes_at, break_start, break_end, appointment_enabled, slot_minutes",
      )
      .eq("clinic_id", clinic.id)
      .order("day_of_week"),
    supabase
      .from("clinic_members")
      .select(
        "professional_user_id, designation, is_primary",
      )
      .eq("clinic_id", clinic.id)
      .eq("membership_status", "active")
      .eq("is_public", true)
      .order("is_primary", { ascending: false }),
  ]);

  const catalogMap = new Map(
    ((catalogRows ?? []) as ServiceCatalog[]).map(
      (row) => [row.id, row],
    ),
  );

  const services = (
    (serviceRows ?? []) as ClinicService[]
  ).map((row) => ({
    ...row,
    service_name:
      catalogMap.get(row.service_id)?.service_name,
    category: catalogMap.get(row.service_id)?.category,
  }));

  const publicMembers =
    (memberRows ?? []) as PublicMemberRow[];
  const memberIds = publicMembers.map(
    (row) => row.professional_user_id,
  );

  let professionalRows: PublicProfessionalBrief[] = [];
  if (memberIds.length) {
    const { data: professionals } = await supabase
      .from("public_professionals")
      .select(
        "user_id, slug, full_name, professional_type, headline, current_position, image_url",
      )
      .in("user_id", memberIds);
    professionalRows =
      (professionals ?? []) as PublicProfessionalBrief[];
  }

  const professionalMap = new Map(
    professionalRows
      .filter((row) => row.user_id)
      .map((row) => [row.user_id as string, row]),
  );

  const team: PublicTeamMember[] = publicMembers.map(
    (membership) => ({
      ...membership,
      ...professionalMap.get(
        membership.professional_user_id,
      ),
    }),
  );

  return {
    clinic,
    services,
    availability:
      (availabilityRows ?? []) as AvailabilityRow[],
    team,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pageData = await loadClinic(slug);
  const clinic = pageData?.clinic;

  if (!clinic) return { title: "Veterinary Clinic" };

  return {
    title: `${clinic.clinic_name} | Veterinary Clinic in ${clinic.city || "Pakistan"}`,
    description:
      clinic.description ||
      `${clinic.clinic_name} veterinary facility profile on VetConnect Pakistan.`,
    alternates: { canonical: `/clinics/${slug}` },
    robots: clinic.is_sample
      ? { index: false, follow: true }
      : undefined,
  };
}

export default async function ClinicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const { slug } = await params;
  const messages = await searchParams;
  const pageData = await loadClinic(slug);
  if (!pageData) notFound();

  const { clinic, services, availability, team } =
    pageData;
  const identity = await getCurrentIdentity();

  const canClaim = Boolean(
    clinic.id &&
      !clinic.is_sample &&
      identity?.roles.some((role) =>
        ["veterinarian", "professional"].includes(role),
      ),
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
    membershipStatus =
      data?.membership_status ?? null;
  }

  const appointmentEnabled =
    !clinic.is_sample &&
    availability.some(
      (row) => row.is_open && row.appointment_enabled,
    );

  const bookableServices = services.filter(
    (service) => service.booking_enabled,
  );

  return (
    <main>
      <SiteHeader />

      {clinic.cover_image_url && (
        <div className="clinic-public-cover">
          <img
            src={clinic.cover_image_url}
            alt={`${clinic.clinic_name} facility`}
          />
        </div>
      )}

      <section className="page-hero">
        <div className="shell company-profile-hero">
          <div className="company-mark company-profile-logo profile-photo-frame">
            <ProfilePhoto
              imageUrl={clinic.logo_url ?? null}
              name={clinic.clinic_name}
              fallback={initials(clinic.clinic_name)}
            />
          </div>

          <div>
            <span className="section-kicker">
              {clinic.is_sample
                ? "SAMPLE FACILITY"
                : "VETCONNECT VERIFIED FACILITY"}
            </span>

            <h1>{clinic.clinic_name}</h1>
            <p>
              {clinic.description ||
                clinic.facility_type}
            </p>

            <div className="profile-chips">
              <span>{clinic.facility_type}</span>
              <span>{clinic.city || "Pakistan"}</span>
              {clinic.emergency_service && (
                <span>Emergency service</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />

          <div className="company-contact-grid">
            <article>
              <span>Location</span>
              <b>
                {clinic.address ||
                  [
                    clinic.city,
                    clinic.tehsil,
                    clinic.district,
                    clinic.province,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "Pakistan"}
              </b>
            </article>

            <article>
              <span>Public contact</span>
              <b>
                {clinic.public_phone ||
                  clinic.public_email ||
                  "Contact details not published"}
              </b>
            </article>

            <article>
              <span>Working hours</span>
              <b>
                {clinic.working_hours ||
                  "Weekly schedule not published"}
              </b>
            </article>
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
                      <h3>
                        {service.service_name ||
                          "Veterinary service"}
                      </h3>

                      {service.description && (
                        <p>{service.description}</p>
                      )}

                      <div className="status-cluster">
                        {service.fee_min !== null && (
                          <span className="status-pill">
                            {service.currency}{" "}
                            {service.fee_min}
                            {service.fee_max !== null
                              ? `–${service.fee_max}`
                              : "+"}
                          </span>
                        )}

                        {service.duration_minutes && (
                          <span className="status-pill">
                            {service.duration_minutes} min
                          </span>
                        )}

                        {service.booking_enabled && (
                          <span className="status-pill">
                            appointment enabled
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-chips">
                {clinic.services.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3>Species served</h3>
            <div className="profile-chips">
              {clinic.species.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div>
            <h3>Verification</h3>
            <p>
              {clinic.profile_verified
                ? "Facility profile verified by VetConnect."
                : clinic.is_sample
                  ? "This is a sample profile."
                  : "Verification review is pending."}
            </p>
          </div>

          <div>
            <h3>Appointments</h3>
            <p>
              {appointmentEnabled
                ? "This clinic accepts appointment requests on selected published days and times."
                : "Online appointment requests are not currently enabled. Use the published contact details."}
            </p>
          </div>
        </div>
      </section>

      {availability.length > 0 && (
        <section className="section compact-section">
          <div className="shell">
            <div className="section-heading">
              <span className="section-kicker">
                WEEKLY AVAILABILITY
              </span>
              <h2>Opening and appointment hours.</h2>
              <p>
                Appointment acceptance may differ from general
                opening hours.
              </p>
            </div>

            <div className="workspace-record-list">
              {dayNames.map((dayName, dayOfWeek) => {
                const row = availability.find(
                  (item) =>
                    item.day_of_week === dayOfWeek,
                );

                return (
                  <article key={dayName}>
                    <div>
                      <h3>{dayName}</h3>
                      <p>
                        {row
                          ? scheduleLabel(row)
                          : "Schedule not published"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {team.length > 0 && (
        <section className="section section-soft">
          <div className="shell">
            <div className="section-heading">
              <span className="section-kicker">
                CLINIC TEAM
              </span>
              <h2>Public professional affiliations.</h2>
              <p>
                Professional affiliation and facility ownership do
                not replace VetConnect or PVMC credential
                verification.
              </p>
            </div>

            <div className="company-grid">
              {team.map((member) => (
                <article
                  key={member.professional_user_id}
                >
                  <div className="company-mark large profile-photo-frame">
                    <ProfilePhoto
                      imageUrl={member.image_url ?? null}
                      name={
                        member.full_name ||
                        member.designation ||
                        "Clinic professional"
                      }
                      fallback={initials(
                        member.full_name ||
                          member.designation ||
                          "Clinic professional",
                      )}
                    />
                  </div>

                  {member.is_primary && (
                    <span className="sample-label">
                      Primary professional
                    </span>
                  )}

                  <h3>
                    {member.full_name ||
                      member.designation ||
                      "Clinic professional"}
                  </h3>

                  <p>
                    {member.designation ||
                      member.current_position ||
                      member.professional_type ||
                      "Professional affiliation"}
                  </p>

                  {member.slug && (
                    <Link
                      className="button button-secondary button-full"
                      href={`/professionals/${member.slug}`}
                    >
                      View professional
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {appointmentEnabled && clinic.id && (
        <section className="section compact-section">
          <div className="shell two-col">
            <div>
              <span className="section-kicker">
                REQUEST APPOINTMENT
              </span>
              <h2>
                Choose a date and time from the clinic&apos;s
                published availability.
              </h2>
              <p>
                This is a request, not an automatic confirmation.
                The clinic confirms or contacts you after review.
              </p>
            </div>

            <form
              className="backend-form-card"
              action={requestClinicAppointmentAction}
            >
              <input
                type="hidden"
                name="clinic_id"
                value={clinic.id}
              />
              <input
                type="hidden"
                name="slug"
                value={clinic.slug}
              />

              <label htmlFor="contact_name">
                Your name
              </label>
              <input
                id="contact_name"
                name="contact_name"
                defaultValue={
                  identity?.profile?.full_name ?? ""
                }
                required
              />

              <div className="form-grid">
                <label>
                  Email
                  <input
                    name="contact_email"
                    type="email"
                    defaultValue={identity?.email ?? ""}
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="contact_phone"
                    type="tel"
                  />
                </label>
              </div>

              <label>
                Animal / species
                <input
                  name="animal_species"
                  placeholder="Dog, cat, cattle, poultry..."
                />
              </label>

              {bookableServices.length > 0 && (
                <label>
                  Service
                  <select
                    name="service_id"
                    defaultValue=""
                  >
                    <option value="">
                      General appointment
                    </option>
                    {bookableServices.map((service) => (
                      <option
                        key={service.service_id}
                        value={service.service_id}
                      >
                        {service.service_name ||
                          "Veterinary service"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-grid">
                <label>
                  Preferred date
                  <input
                    type="date"
                    name="preferred_date"
                    min={pakistanToday()}
                    required
                  />
                </label>

                <label>
                  Preferred time
                  <input
                    type="time"
                    name="preferred_time"
                    required
                  />
                </label>
              </div>

              <p className="form-help">
                The system validates the selected day and time
                against the clinic&apos;s weekly appointment
                schedule before submitting.
              </p>

              <label>
                Reason for visit
                <textarea
                  name="reason"
                  placeholder="Briefly describe the animal's problem or purpose of visit."
                  required
                />
              </label>

              <FormSubmitButton pendingLabel="Sending request...">
                Send appointment request
              </FormSubmitButton>
            </form>
          </div>
        </section>
      )}

      {canClaim && clinic.id && (
        <section className="section compact-section">
          <div className="shell two-col">
            <div>
              <span className="section-kicker">
                PROFESSIONAL AFFILIATION
              </span>
              <h2>
                Link this clinic to your professional profile.
              </h2>
              <p>
                Clinic affiliation does not replace PVMC or
                professional verification. The facility owner
                reviews the claim separately.
              </p>
            </div>

            <div className="backend-form-card">
              {membershipStatus ? (
                <div className="setup-notice">
                  <p>
                    Your clinic affiliation status is{" "}
                    <strong>{membershipStatus}</strong>.
                  </p>
                </div>
              ) : (
                <form action={requestClinicMembershipAction}>
                  <input
                    type="hidden"
                    name="clinic_id"
                    value={clinic.id}
                  />
                  <input
                    type="hidden"
                    name="slug"
                    value={clinic.slug}
                  />

                  <label htmlFor="designation">
                    Your designation at this clinic
                  </label>
                  <input
                    id="designation"
                    name="designation"
                    placeholder="Veterinarian, consultant, surgeon, medical director"
                  />

                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      name="is_public"
                    />{" "}
                    Show this affiliation publicly after approval
                  </label>

                  <FormSubmitButton pendingLabel="Submitting affiliation...">
                    Request clinic affiliation
                  </FormSubmitButton>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section compact-section">
        <div className="shell card-actions">
          <Link
            className="button button-secondary"
            href="/clinics"
          >
            Back to facilities
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
