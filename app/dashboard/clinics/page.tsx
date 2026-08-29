import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import PakistanLocationFields from "../../components/PakistanLocationFields";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createClinicAction } from "./actions";

export const dynamic = "force-dynamic";

const eligibleRoles = new Set(["veterinarian", "professional"]);

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
    redirect("/dashboard?error=Clinic%20workspace%20is%20available%20to%20veterinary%20professionals.");
  }

  const supabase = await createClient();
  const [{ data: owned, error: ownedError }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, slug, clinic_name, facility_type, city, province, verification_status, is_published, emergency_service, updated_at")
      .eq("owner_id", identity.userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clinic_members")
      .select("clinic_id, designation, membership_status, claim_source, is_public")
      .eq("professional_user_id", identity.userId)
      .order("updated_at", { ascending: false }),
  ]);

  const ownedClinics = (owned ?? []) as ClinicRow[];
  const membershipRows = (memberships ?? []) as MembershipRow[];
  const membershipClinicIds = membershipRows
    .map((row) => row.clinic_id)
    .filter((id) => !ownedClinics.some((clinic) => clinic.id === id));
  let affiliatedClinics: Pick<ClinicRow, "id" | "slug" | "clinic_name" | "facility_type" | "city" | "province">[] = [];

  if (membershipClinicIds.length) {
    const { data } = await supabase
      .from("clinics")
      .select("id, slug, clinic_name, facility_type, city, province")
      .in("id", membershipClinicIds);
    affiliatedClinics = data ?? [];
  }

  const affiliationMap = new Map(affiliatedClinics.map((clinic) => [clinic.id, clinic]));

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">CLINIC WORKSPACE</span>
            <h1>Manage veterinary facilities and affiliations.</h1>
            <p>Create a clinic profile, manage public information and track affiliation requests.</p>
          </div>
          <div className="dashboard-actions">
            <Link className="button button-secondary" href="/clinics">Public clinic directory</Link>
            <Link className="button button-dark" href="/dashboard">Account dashboard</Link>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />
          {(ownedError || membershipError) && (
            <div className="form-message form-message-error">
              {ownedError?.message || membershipError?.message}
            </div>
          )}

          <div className="section-heading">
            <span className="section-kicker">MY FACILITIES</span>
            <h2>Clinics you own.</h2>
            <p>Substantive owner edits are automatically returned to verification review.</p>
          </div>
          {ownedClinics.length === 0 ? (
            <div className="empty-state"><h2>No owned clinic yet.</h2><p>Create your first veterinary facility below.</p></div>
          ) : (
            <div className="company-grid clinic-workspace-grid">
              {ownedClinics.map((clinic) => (
                <article key={clinic.id}>
                  <span className="module-tag">{clinic.facility_type}</span>
                  <h3>{clinic.clinic_name}</h3>
                  <p>{[clinic.city, clinic.province].filter(Boolean).join(", ") || "Location pending"}</p>
                  <div className="status-cluster">
                    <span className={`status-pill status-${clinic.verification_status}`}>{clinic.verification_status}</span>
                    <span className="status-pill">{clinic.is_published ? "published" : "not published"}</span>
                    {clinic.emergency_service && <span className="status-pill">emergency service</span>}
                  </div>
                  <Link className="button button-primary button-full" href={`/dashboard/clinics/${clinic.id}`}>Manage clinic</Link>
                </article>
              ))}
            </div>
          )}

          <div className="section-heading workspace-heading-gap">
            <span className="section-kicker">AFFILIATIONS</span>
            <h2>Clinics linked to your professional profile.</h2>
          </div>
          {membershipRows.length === 0 ? (
            <p className="workspace-muted">No clinic affiliation claims or invitations yet.</p>
          ) : (
            <div className="admin-data-list">
              {membershipRows.map((membership) => {
                const clinic = affiliationMap.get(membership.clinic_id);
                return (
                  <article key={membership.clinic_id}>
                    <div className="admin-data-main">
                      <div className="admin-data-title"><span className="module-tag">{membership.claim_source.replaceAll("_", " ")}</span><h2>{clinic?.clinic_name || "Clinic affiliation"}</h2></div>
                      <p>{membership.designation || "Designation not specified"}</p>
                      <div className="status-cluster"><span className={`status-pill status-${membership.membership_status}`}>{membership.membership_status}</span><span className="status-pill">{membership.is_public ? "public on profile" : "private"}</span></div>
                    </div>
                    {clinic?.slug && <Link className="button button-secondary" href={`/clinics/${clinic.slug}`}>View clinic</Link>}
                  </article>
                );
              })}
            </div>
          )}

          <form className="backend-form-card workspace-section-card workspace-heading-gap" action={createClinicAction}>
            <div className="section-heading">
              <span className="section-kicker">ADD FACILITY</span>
              <h2>Create a clinic or veterinary hospital profile.</h2>
              <p>The new facility starts pending review and unpublished.</p>
            </div>
            <div className="form-grid">
              <div><label htmlFor="clinic_name">Clinic / facility name</label><input id="clinic_name" name="clinic_name" required /></div>
              <div><label htmlFor="facility_type">Facility type</label><select id="facility_type" name="facility_type" defaultValue="Veterinary Clinic"><option>Veterinary Clinic</option><option>Veterinary Hospital</option><option>Pet Clinic</option><option>Livestock Clinic</option><option>Farm Veterinary Service</option><option>Mobile Veterinary Service</option></select></div>
              <PakistanLocationFields />
              <div className="form-span-2"><label htmlFor="address">Address</label><input id="address" name="address" /></div>
              <div><label htmlFor="public_phone">Public phone</label><input id="public_phone" name="public_phone" /></div>
              <div><label htmlFor="public_email">Public email</label><input id="public_email" name="public_email" type="email" /></div>
              <div><label htmlFor="website">Website</label><input id="website" name="website" type="url" /></div>
              <div><label htmlFor="working_hours">Working hours</label><input id="working_hours" name="working_hours" placeholder="Mon-Sat 9:00 AM - 8:00 PM" /></div>
              <div className="form-span-2"><label htmlFor="services">Initial services</label><input id="services" name="services" placeholder="Consultation, vaccination, surgery" /><p className="form-help">Separate with commas. You can add standardized services after creating the clinic.</p></div>
              <div className="form-span-2"><label htmlFor="species">Species served</label><input id="species" name="species" placeholder="Dogs, cats, cattle, buffalo, poultry" /></div>
              <div className="form-span-2"><label htmlFor="description">Facility description</label><textarea id="description" name="description" /></div>
              <label className="checkbox-line"><input type="checkbox" name="emergency_service" /> Emergency service available</label>
            </div>
            <FormSubmitButton pendingLabel="Creating clinic...">Create clinic</FormSubmitButton>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
