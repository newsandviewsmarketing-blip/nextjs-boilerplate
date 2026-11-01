import Link from "next/link";
import { redirect } from "next/navigation";
import CareerWorkspaceFrame from "@/app/components/CareerWorkspaceFrame";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import PakistanLocationFields from "../../components/PakistanLocationFields";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createClinicAction,
  respondClinicInvitationAction,
  setClinicAffiliationVisibilityAction,
} from "./actions";

export const dynamic = "force-dynamic";

const eligibleRoles = new Set([
  "veterinarian",
  "professional",
  "company",
]);

type ClinicRow = {
  id: string;
  slug: string;
  clinic_name: string;
  facility_type: string;
  city: string | null;
  province: string | null;
  verification_status: string;
  is_published: boolean;
  emergency_service: boolean;
  updated_at: string;
};

type MembershipRow = {
  clinic_id: string;
  designation: string | null;
  membership_status: string;
  claim_source: string;
  is_public: boolean;
};

export default async function ClinicWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const messages = await searchParams;
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/clinics");
  if (!identity.roles.some((role) => eligibleRoles.has(role))) {
    redirect(
      "/dashboard?error=Clinic%20workspace%20is%20not%20available%20for%20this%20account.",
    );
  }

  const supabase = await createClient();
  const [
    { data: owned, error: ownedError },
    { data: memberships, error: membershipError },
  ] = await Promise.all([
    supabase
      .from("clinics")
      .select(
        "id, slug, clinic_name, facility_type, city, province, verification_status, is_published, emergency_service, updated_at",
      )
      .eq("owner_id", identity.userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clinic_members")
      .select(
        "clinic_id, designation, membership_status, claim_source, is_public",
      )
      .eq("professional_user_id", identity.userId)
      .order("updated_at", { ascending: false }),
  ]);

  const ownedClinics = (owned ?? []) as ClinicRow[];
  const membershipRows = (memberships ?? []) as MembershipRow[];
  const membershipClinicIds = membershipRows
    .map((row) => row.clinic_id)
    .filter(
      (id) =>
        !ownedClinics.some((clinic) => clinic.id === id),
    );

  let affiliatedClinics: Pick<
    ClinicRow,
    "id" | "slug" | "clinic_name" | "facility_type" | "city" | "province"
  >[] = [];

  if (membershipClinicIds.length) {
    const { data } = await supabase
      .from("clinics")
      .select(
        "id, slug, clinic_name, facility_type, city, province",
      )
      .in("id", membershipClinicIds);
    affiliatedClinics = data ?? [];
  }

  const affiliationMap = new Map(
    affiliatedClinics.map((clinic) => [clinic.id, clinic]),
  );

  const {data:practitioner}=identity.roles.includes("veterinarian")
    ? await supabase.from("veterinarian_profiles").select("pvmc_number").eq("user_id",identity.userId).maybeSingle()
    : {data:null};

  return (
    <CareerWorkspaceFrame
      active="connections"
      name={identity.profile?.full_name || identity.email}
      headline="Clinic & veterinary practice"
      title="Your clinic practice, in one place."
      description="Create a clinic draft, configure professional services and hours, manage staff and appointments, then request VetConnect review before public listing.">
      <section className="vcx-clinic-operations">
       <div className="vcx-clinic-steps">
        <div><b>01</b><span>Clinic identity & responsible veterinarian</span></div>
        <div><b>02</b><span>Location, skills & services</span></div>
        <div><b>03</b><span>Hours, slots & fees</span></div>
        <div><b>04</b><span>Staff & admin publication review</span></div>
       </div>
       <p className="vcx-secondary">Clinic profile information remains private during setup. Only a reviewed and approved facility can become publicly listed. Saving a clinic does not verify a PVMC number.</p>
          <FormMessage {...messages} />

          {(ownedError || membershipError) && (
            <div className="form-message form-message-error">
              {ownedError?.message || membershipError?.message}
            </div>
          )}

          <div className="section-heading">
            <span className="section-kicker">MY FACILITIES</span>
            <h2>Clinics you own.</h2>
            <p>
              Each clinic has its own facility profile, weekly
              hours, appointment inbox, services and team hierarchy.
            </p>
          </div>

          {ownedClinics.length === 0 ? (
            <div className="empty-state">
              <h2>No owned clinic yet.</h2>
              <p>Create your first veterinary facility below.</p>
            </div>
          ) : (
            <div className="company-grid clinic-workspace-grid">
              {ownedClinics.map((clinic) => (
                <article key={clinic.id}>
                  <span className="module-tag">
                    {clinic.facility_type}
                  </span>
                  <h3>{clinic.clinic_name}</h3>
                  <p>
                    {[clinic.city, clinic.province]
                      .filter(Boolean)
                      .join(", ") || "Location pending"}
                  </p>

                  <div className="status-cluster">
                    <span
                      className={`status-pill status-${clinic.verification_status}`}
                    >
                      {clinic.verification_status}
                    </span>
                    <span className="status-pill">
                      {clinic.is_published
                        ? "published"
                        : "not published"}
                    </span>
                    {clinic.emergency_service && (
                      <span className="status-pill">
                        emergency service
                      </span>
                    )}
                  </div>

                  <Link
                    className="button button-primary button-full"
                    href={`/dashboard/clinics/${clinic.id}`}
                  >
                    Manage clinic
                  </Link>
                </article>
              ))}
            </div>
          )}

          <div className="section-heading workspace-heading-gap">
            <span className="section-kicker">
              PROFESSIONAL AFFILIATIONS
            </span>
            <h2>Clinics linked to your professional profile.</h2>
            <p>
              Invitations require your acceptance. Active
              affiliations can be shown or hidden on your public
              profile without changing professional verification.
            </p>
          </div>

          {membershipRows.length === 0 ? (
            <p className="workspace-muted">
              No clinic affiliation claims or invitations yet.
            </p>
          ) : (
            <div className="admin-data-list">
              {membershipRows.map((membership) => {
                const clinic = affiliationMap.get(
                  membership.clinic_id,
                );
                const isPendingInvite =
                  membership.membership_status === "pending" &&
                  membership.claim_source ===
                    "clinic_invitation";
                const isActive =
                  membership.membership_status === "active";

                return (
                  <article key={membership.clinic_id}>
                    <div className="admin-data-main">
                      <div className="admin-data-title">
                        <span className="module-tag">
                          {membership.claim_source.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>
                        <h2>
                          {clinic?.clinic_name ||
                            "Clinic affiliation"}
                        </h2>
                      </div>

                      <p>
                        {membership.designation ||
                          "Designation not specified"}
                      </p>

                      <div className="status-cluster">
                        <span
                          className={`status-pill status-${membership.membership_status}`}
                        >
                          {membership.membership_status}
                        </span>
                        <span className="status-pill">
                          {membership.is_public
                            ? "public on profile"
                            : "private"}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      {clinic?.slug && (
                        <Link
                          className="button button-secondary"
                          href={`/clinics/${clinic.slug}`}
                        >
                          View clinic
                        </Link>
                      )}

                      {isPendingInvite && (
                        <>
                          <form
                            action={respondClinicInvitationAction}
                          >
                            <input
                              type="hidden"
                              name="clinic_id"
                              value={membership.clinic_id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="accept"
                            />
                            <button
                              className="button button-primary"
                              type="submit"
                            >
                              Accept invitation
                            </button>
                          </form>

                          <form
                            action={respondClinicInvitationAction}
                          >
                            <input
                              type="hidden"
                              name="clinic_id"
                              value={membership.clinic_id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="decline"
                            />
                            <button
                              className="button button-secondary"
                              type="submit"
                            >
                              Decline
                            </button>
                          </form>
                        </>
                      )}

                      {isActive && (
                        <form
                          action={
                            setClinicAffiliationVisibilityAction
                          }
                        >
                          <input
                            type="hidden"
                            name="clinic_id"
                            value={membership.clinic_id}
                          />
                          <input
                            type="hidden"
                            name="is_public"
                            value={
                              membership.is_public
                                ? "false"
                                : "true"
                            }
                          />
                          <button
                            className="button button-secondary"
                            type="submit"
                          >
                            {membership.is_public
                              ? "Make private"
                              : "Show publicly"}
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <details className="vcx-clinic-new" open={ownedClinics.length===0}>
           <summary><strong>Register another clinic or veterinary hospital</strong><span>Begin a separate facility draft without changing your personal professional profile.</span></summary>
          <form
            id="new-clinic"
            className="backend-form-card workspace-section-card workspace-heading-gap"
            action={createClinicAction}
          >
            <div className="section-heading">
              <span className="section-kicker">
                ADD FACILITY
              </span>
              <h2>
                Create a clinic or veterinary hospital profile.
              </h2>
              <p>
                The new facility starts pending review and
                unpublished. Weekly opening hours and appointment
                availability are configured immediately after
                creation.
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
                  defaultValue="Veterinary Clinic"
                >
                  <option>Veterinary Clinic</option>
                  <option>Veterinary Hospital</option>
                  <option>Pet Clinic</option>
                  <option>Livestock Clinic</option>
                  <option>Farm Veterinary Service</option>
                  <option>Mobile Veterinary Service</option>
                </select>
              </div>

              <div className="form-span-2">
                <h3>Responsible registered veterinarian</h3>
                <p className="form-help">Clinic ownership can differ from clinical responsibility. A PVMC-registered practitioner must be identified for veterinary practice. These details are private until administrator review.</p>
              </div>
              <div>
               <label htmlFor="responsible_veterinarian_name">Responsible veterinarian's full name</label>
               <input id="responsible_veterinarian_name" name="responsible_veterinarian_name" maxLength={180}
                defaultValue={identity.roles.includes("veterinarian") ? identity.profile?.full_name ?? "" : ""} placeholder="Name on PVMC registration" />
              </div>
              <div>
               <label htmlFor="responsible_veterinarian_pvmc">PVMC registration number</label>
               <input id="responsible_veterinarian_pvmc" name="responsible_veterinarian_pvmc" maxLength={70}
                defaultValue={identity.roles.includes("veterinarian") ? practitioner?.pvmc_number ?? "" : ""} placeholder="Registered veterinarian's PVMC number" />
               <p className="form-help">Required before clinic publication. <a href="https://pvmc.gov.pk/Registration/Search" target="_blank" rel="noopener noreferrer">Official PVMC lookup</a></p>
              </div>
              <PakistanLocationFields />

              <div className="form-span-2">
                <label htmlFor="address">Address</label>
                <input id="address" name="address" />
              </div>

              <div>
                <label htmlFor="public_phone">
                  Public phone
                </label>
                <input
                  id="public_phone"
                  name="public_phone"
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
                />
              </div>

              <div>
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="url"
                />
              </div>

              <div>
                <label>Working hours</label>
                <input
                  value="Set after clinic creation"
                  readOnly
                />
                <p className="form-help">
                  The next screen provides Monday-Sunday calendar
                  and clock controls.
                </p>
              </div>

              <div className="form-span-2">
                <label htmlFor="services">
                  Initial services
                </label>
                <input
                  id="services"
                  name="services"
                  placeholder="Consultation, vaccination, surgery"
                />
                <p className="form-help">
                  Separate with commas. You can add standardized
                  services after creating the clinic.
                </p>
              </div>

              <div className="form-span-2">
                <label htmlFor="species">
                  Species served
                </label>
                <input
                  id="species"
                  name="species"
                  placeholder="Dogs, cats, cattle, buffalo, poultry"
                />
              </div>

              <div className="form-span-2">
                <label htmlFor="description">
                  Facility description
                </label>
                <textarea
                  id="description"
                  name="description"
                />
              </div>

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  name="emergency_service"
                />{" "}
                Emergency service available
              </label>
            </div>

            <p className="form-help">This saves an unpublished draft. Responsible veterinarian information, clinic hours, services and booking settings are reviewed before publication.</p>
            <FormSubmitButton pendingLabel="Saving clinic draft...">
              Save clinic draft
            </FormSubmitButton>
          </form>
          </details>
      </section>
    </CareerWorkspaceFrame>
  );
}
