import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { signOutAction } from "../auth/actions";
import { updateProfileAction } from "./actions";
import { getCurrentIdentity, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function statusLabel(status?: string | null) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Needs correction";
  return "Pending review";
}

const companyRoleOptions = [
  ["manufacturer", "Manufacturer"],
  ["principal", "Principal"],
  ["importer", "Importer"],
  ["distributor", "Distributor"],
  ["marketer", "Marketer"],
  ["indentor", "Indentor"],
  ["registration_holder", "Registration Holder"],
  ["service_provider", "Service Provider"],
] as const;

const sectorOptions = [
  "Poultry",
  "Livestock",
  "Dairy",
  "Pets / Companion Animals",
  "Equine",
  "Aquaculture / Fisheries",
  "Feed / Nutrition",
  "Diagnostics / Laboratory",
  "Biosecurity",
  "Equipment / Technology",
  "One Health",
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <main>
        <SiteHeader />
        <section className="auth-section">
          <div className="single-form-shell">
            <div className="backend-form-card">
              <span className="section-kicker">BACKEND SETUP</span>
              <h1>Connect the VetConnect database.</h1>
              <p>
                Add the Supabase environment variables and run the included
                migration before accounts can be used.
              </p>
              <Link className="button button-primary" href="/">
                Return home
              </Link>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard");
  const supabase = await createClient();
  const role = identity.profile?.primary_role ?? identity.roles[0] ?? "user";
  const isAdmin = identity.roles.some(isAdminRole);
  let specialistProfile: Record<string, unknown> | null = null;
  let companyRoleRows: { role_type: string; details: string }[] = [];
  let companySectorRows: { sector: string }[] = [];

  if (role === "veterinarian") {
    const { data } = await supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("user_id", identity.userId)
      .maybeSingle();
    specialistProfile = data;
  } else if (role === "company") {
    const [{ data }, { data: roles }, { data: sectors }] = await Promise.all([
      supabase.from("company_profiles").select("*").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("company_roles").select("role_type, details").eq("company_user_id", identity.userId).eq("is_active", true),
      supabase.from("company_sectors").select("sector").eq("company_user_id", identity.userId),
    ]);
    specialistProfile = data;
    companyRoleRows = roles ?? [];
    companySectorRows = sectors ?? [];
  } else if (role === "professional" || role === "candidate") {
    const { data } = await supabase
      .from("professional_profiles")
      .select("*")
      .eq("user_id", identity.userId)
      .maybeSingle();
    specialistProfile = data;
  } else if (role === "laboratory") {
    const { data } = await supabase
      .from("laboratories")
      .select("*")
      .eq("owner_id", identity.userId)
      .maybeSingle();
    specialistProfile = data;
  }

  const verificationStatus = specialistProfile?.verification_status as
    | string
    | undefined;
  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">MY VETCONNECT</span>
            <h1>Welcome, {identity.profile?.full_name || identity.email}.</h1>
            <p>
              {identity.email} · {String(role).replaceAll("_", " ")}
            </p>
          </div>
          <div className="dashboard-actions">
            {isAdmin && (
              <Link className="button button-secondary" href="/admin">
                Open admin panel
              </Link>
            )}
            <form action={signOutAction}>
              <button className="button button-dark" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell dashboard-layout">
          <aside className="dashboard-sidebar">
            <h3>Account overview</h3>
            <div className="dashboard-stat">
              <span>Account</span>
              <b>{identity.profile?.account_status ?? "active"}</b>
            </div>
            {(["veterinarian", "company", "professional", "candidate", "laboratory"] as string[]).includes(role) && (
              <div className="dashboard-stat">
                <span>Verification</span>
                <b
                  className={`status-text status-${verificationStatus ?? "pending"}`}
                >
                  {statusLabel(verificationStatus)}
                </b>
              </div>
            )}
            <div className="dashboard-stat">
              <span>Roles</span>
              <b>
                {identity.roles
                  .map((item) => item.replaceAll("_", " "))
                  .join(", ")}
              </b>
            </div>
          </aside>
          <div>
            <FormMessage {...params} />
            <form className="backend-form-card" action={updateProfileAction}>
              <div className="section-heading">
                <span className="section-kicker">PROFILE</span>
                <h2>Manage your account details.</h2>
                <p>
                  Saved information is protected by account-level database
                  policies.
                </p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="full_name">Full name</label>
                  <input
                    id="full_name"
                    name="full_name"
                    defaultValue={identity.profile?.full_name ?? ""}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    defaultValue={identity.profile?.phone ?? ""}
                  />
                </div>
                <div>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    name="city"
                    defaultValue={identity.profile?.city ?? ""}
                  />
                </div>
                {role === "veterinarian" && (
                  <>
                    <div>
                      <label htmlFor="pvmc_number">
                        PVMC registration number
                      </label>
                      <input
                        id="pvmc_number"
                        name="pvmc_number"
                        defaultValue={String(
                          specialistProfile?.pvmc_number ?? "",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="qualifications">Qualifications</label>
                      <input
                        id="qualifications"
                        name="qualifications"
                        defaultValue={String(
                          specialistProfile?.qualifications ?? "",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="specialization">Specialization</label>
                      <input
                        id="specialization"
                        name="specialization"
                        defaultValue={String(
                          specialistProfile?.specialization ?? "",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="years_experience">
                        Years of experience
                      </label>
                      <input
                        id="years_experience"
                        name="years_experience"
                        type="number"
                        min="0"
                        defaultValue={String(
                          specialistProfile?.years_experience ?? 0,
                        )}
                      />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="services">
                        Services, separated by commas
                      </label>
                      <input
                        id="services"
                        name="services"
                        defaultValue={
                          Array.isArray(specialistProfile?.services)
                            ? specialistProfile.services.join(", ")
                            : ""
                        }
                      />
                    </div>
                  </>
                )}
                {role === "company" && (
                  <>
                    <div>
                      <label htmlFor="company_name">Company name</label>
                      <input
                        id="company_name"
                        name="company_name"
                        defaultValue={String(
                          specialistProfile?.company_name ?? "",
                        )}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="business_type">Business type</label>
                      <input
                        id="business_type"
                        name="business_type"
                        defaultValue={String(
                          specialistProfile?.business_type ?? "",
                        )}
                      />
                    </div>
                    <div className="form-span-2">
                      <label>Company roles and role details</label>
                      <div className="role-check-grid">
                        {companyRoleOptions.map(([value, label]) => {
                          const saved = companyRoleRows.find((item) => item.role_type === value);
                          return (
                            <div className="role-check-row" key={value}>
                              <label>
                                <input type="checkbox" name="company_roles" value={value} defaultChecked={Boolean(saved)} />
                                {label}
                              </label>
                              <input name={`role_details_${value}`} defaultValue={saved?.details ?? ""} placeholder={`What does the company do as ${label.toLowerCase()}?`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="company_sectors">Sector coverage</label>
                      <select id="company_sectors" name="company_sectors" multiple defaultValue={companySectorRows.map((item) => item.sector)}>
                        {sectorOptions.map((sector) => <option key={sector}>{sector}</option>)}
                      </select>
                      <p className="form-help">Use Ctrl or Command to select more than one sector.</p>
                    </div>
                    <div>
                      <label htmlFor="registration_number">
                        NTN / registration number
                      </label>
                      <input
                        id="registration_number"
                        name="registration_number"
                        defaultValue={String(
                          specialistProfile?.registration_number ?? "",
                        )}
                      />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="address">Business address</label>
                      <input
                        id="address"
                        name="address"
                        defaultValue={String(specialistProfile?.address ?? "")}
                      />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="description">Company description</label>
                      <textarea
                        id="description"
                        name="description"
                        defaultValue={String(
                          specialistProfile?.description ?? "",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="url"
                        defaultValue={String(specialistProfile?.website ?? "")}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact_email">Public contact email</label>
                      <input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={String(
                          specialistProfile?.contact_email ?? "",
                        )}
                      />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="logo_url">Public logo URL</label>
                      <input
                        id="logo_url"
                        name="logo_url"
                        type="url"
                        defaultValue={String(specialistProfile?.logo_url ?? "")}
                      />
                    </div>
                  </>
                )}
                {(role === "professional" || role === "candidate") && (
                  <>
                    <div>
                      <label htmlFor="professional_type">Professional type</label>
                      <input id="professional_type" name="professional_type" defaultValue={String(specialistProfile?.professional_type ?? (role === "candidate" ? "Student / Job Seeker" : "Animal Health Professional"))} />
                    </div>
                    <div>
                      <label htmlFor="headline">Professional headline</label>
                      <input id="headline" name="headline" defaultValue={String(specialistProfile?.headline ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="current_position">Current position</label>
                      <input id="current_position" name="current_position" defaultValue={String(specialistProfile?.current_position ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="organization_name">Organization</label>
                      <input id="organization_name" name="organization_name" defaultValue={String(specialistProfile?.organization_name ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="province">Province</label>
                      <input id="province" name="province" defaultValue={String(specialistProfile?.province ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="years_experience">Years of experience</label>
                      <input id="years_experience" name="years_experience" type="number" min="0" defaultValue={String(specialistProfile?.years_experience ?? 0)} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="skills">Skills, separated by commas</label>
                      <input id="skills" name="skills" defaultValue={Array.isArray(specialistProfile?.skills) ? specialistProfile.skills.join(", ") : ""} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="public_summary">Public professional summary</label>
                      <textarea id="public_summary" name="public_summary" defaultValue={String(specialistProfile?.public_summary ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="profile_visibility">Profile visibility</label>
                      <select id="profile_visibility" name="profile_visibility" defaultValue={String(specialistProfile?.profile_visibility ?? "owner_only")}>
                        <option value="owner_only">Only me</option>
                        <option value="registered_users">Registered users</option>
                        <option value="authorized_company">Approved recruiters</option>
                        <option value="public">Public professional summary</option>
                      </select>
                    </div>
                  </>
                )}
                {role === "laboratory" && (
                  <>
                    <div>
                      <label htmlFor="laboratory_name">Laboratory name</label>
                      <input id="laboratory_name" name="laboratory_name" defaultValue={String(specialistProfile?.laboratory_name ?? "")} required />
                    </div>
                    <div>
                      <label htmlFor="laboratory_type">Laboratory type</label>
                      <input id="laboratory_type" name="laboratory_type" defaultValue={String(specialistProfile?.laboratory_type ?? "Diagnostic Laboratory")} />
                    </div>
                    <div>
                      <label htmlFor="technical_head">Technical head</label>
                      <input id="technical_head" name="technical_head" defaultValue={String(specialistProfile?.technical_head ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="province">Province</label>
                      <input id="province" name="province" defaultValue={String(specialistProfile?.province ?? "")} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="address">Laboratory address</label>
                      <input id="address" name="address" defaultValue={String(specialistProfile?.address ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="public_phone">Public phone</label>
                      <input id="public_phone" name="public_phone" defaultValue={String(specialistProfile?.public_phone ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="public_email">Public email</label>
                      <input id="public_email" name="public_email" type="email" defaultValue={String(specialistProfile?.public_email ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="website">Website</label>
                      <input id="website" name="website" type="url" defaultValue={String(specialistProfile?.website ?? "")} />
                    </div>
                    <div>
                      <label htmlFor="working_hours">Working hours</label>
                      <input id="working_hours" name="working_hours" defaultValue={String(specialistProfile?.working_hours ?? "")} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="tests_offered">Tests offered, separated by commas</label>
                      <input id="tests_offered" name="tests_offered" defaultValue={Array.isArray(specialistProfile?.tests_offered) ? specialistProfile.tests_offered.join(", ") : ""} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="species_served">Species or sectors served, separated by commas</label>
                      <input id="species_served" name="species_served" defaultValue={Array.isArray(specialistProfile?.species_served) ? specialistProfile.species_served.join(", ") : ""} />
                    </div>
                    <div className="form-span-2">
                      <label htmlFor="description">Laboratory description</label>
                      <textarea id="description" name="description" defaultValue={String(specialistProfile?.description ?? "")} />
                    </div>
                    <label className="checkbox-line"><input type="checkbox" name="emergency_service" defaultChecked={Boolean(specialistProfile?.emergency_service)} /> Emergency service available</label>
                  </>
                )}
              </div>
              <FormSubmitButton pendingLabel="Saving profile...">
                Save profile
              </FormSubmitButton>
            </form>
            <div className="dashboard-module-grid">
              <article>
                <span>PROFILE</span>
                <h3>Account and verification</h3>
                <p>Maintain identity, contact and role-specific information.</p>
              </article>
              <article>
                <span>JOBS</span>
                <h3>Career workspace</h3>
                <p>
                  Job posting and application records will connect in the next
                  module.
                </p>
              </article>
              <article>
                <span>MARKETPLACE</span>
                <h3>Business listings</h3>
                <p>
                  Approved companies can submit products and answer customer
                  requests.
                </p>
                {role === "company" && (
                  <Link href="/dashboard/company">Open company workspace →</Link>
                )}
              </article>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
