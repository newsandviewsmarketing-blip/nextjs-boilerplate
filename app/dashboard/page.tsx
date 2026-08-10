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

  if (role === "veterinarian") {
    const { data } = await supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("user_id", identity.userId)
      .maybeSingle();
    specialistProfile = data;
  } else if (role === "company") {
    const { data } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", identity.userId)
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
            {(role === "veterinarian" || role === "company") && (
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
