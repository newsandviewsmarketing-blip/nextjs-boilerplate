import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { requestRegistrationOtpAction } from "../auth/actions";
import { isAllowedSelfRegistrationRole } from "@/lib/auth";

const roles = [
  [
    "veterinarian",
    "Veterinary Professional",
    "Qualifications, PVMC details, expertise and verification.",
  ],
  [
    "company",
    "Company / Employer",
    "Business profile, products, jobs and company verification.",
  ],
  [
    "candidate",
    "Student / Job Seeker",
    "Career profile, CV, jobs, internships and learning.",
  ],
  [
    "professional",
    "Industry Professional",
    "Structured profile for nutrition, laboratory, research, academia, farm and technical roles.",
  ],
  [
    "laboratory",
    "Diagnostic Laboratory",
    "Laboratory identity, locations, test menu and verification.",
  ],
  [
    "user",
    "Animal Owner / Farmer / Pet Owner",
    "Veterinary services, bookings, animal or farm needs and relevant products.",
  ],
] as const;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; intent?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const clinicIntent = params.intent === "clinic";
  const selectedRole =
    clinicIntent
      ? "company"
      : params.role && isAllowedSelfRegistrationRole(params.role)
        ? params.role
        : "veterinarian";

  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="shell">
          <div className="section-heading centered">
            <span className="section-kicker">JOIN VETCONNECT</span>
            <h1>Create your account.</h1>
            <p>
              Select an account type, complete the form and verify the code sent
              to your email address.
            </p>
          </div>
          <div className="register-grid">
            {roles.map((role, index) => (
              <article
                className={selectedRole === role[0] ? "selected-role-card" : ""}
                key={role[0]}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{role[1]}</h2>
                <p>{role[2]}</p>
                <Link
                  className="button button-primary button-full"
                  href={`/register?role=${role[0]}#registration`}
                >
                  Select account type
                </Link>
              </article>
            ))}
            <article className={clinicIntent ? "selected-role-card" : ""}>
              <span>07</span>
              <h2>Clinic / Veterinary Hospital</h2>
              <p>
                Veterinary clinic, pet clinic, veterinary hospital, farm or
                mobile veterinary service registration.
              </p>
              <Link
                className="button button-primary button-full"
                href="/register?role=company&intent=clinic#registration"
              >
                Select account type
              </Link>
            </article>
          </div>

          <form
            id="registration"
            className="backend-form-card"
            action={requestRegistrationOtpAction}
          >
            <div className="section-heading">
              <span className="section-kicker">ACCOUNT DETAILS</span>
              <h2>Registration form</h2>
            </div>
            <FormMessage error={params.error} message={params.message} />
            <div className="form-grid">
              {clinicIntent ? (
                <>
                  <input type="hidden" name="role" value="company" />
                  <div>
                    <label htmlFor="registration_pathway">
                      Registration pathway
                    </label>
                    <input
                      id="registration_pathway"
                      value="Clinic / Veterinary Hospital"
                      readOnly
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="role">Account type</label>
                  <select
                    id="role"
                    name="role"
                    defaultValue={selectedRole}
                    required
                  >
                    {roles.map((role) => (
                      <option key={role[0]} value={role[0]}>
                        {role[1]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="full_name">
                  {clinicIntent
                    ? "Clinic owner / authorized person"
                    : "Full name / authorized person"}
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone">Phone number</label>
                <input id="phone" name="phone" type="tel" autoComplete="tel" />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input id="city" name="city" autoComplete="address-level2" />
              </div>
              <div>
                <label htmlFor="organization_name">
                  {clinicIntent
                    ? "Clinic / hospital name"
                    : "Company / organization name"}
                </label>
                <input
                  id="organization_name"
                  name="organization_name"
                  required={clinicIntent}
                />
              </div>
              <div>
                <label htmlFor="pvmc_number">
                  {clinicIntent
                    ? "Responsible veterinarian PVMC registration number"
                    : "PVMC registration number"}
                </label>
                <input id="pvmc_number" name="pvmc_number" />
              </div>
            </div>
            <p className="form-help">
              {clinicIntent
                ? "This step creates the secure account for the clinic or veterinary hospital. After email verification, complete the facility profile in the Clinic Workspace. Public listing remains subject to VetConnect review and responsible-veterinarian/PVMC verification where applicable."
                : "Veterinarian, professional, laboratory and company accounts remain pending until VetConnect reviews the submitted profile. A six-digit code will be sent to your email to complete registration."}
            </p>
            <FormSubmitButton pendingLabel="Sending code...">
              Send registration code
            </FormSubmitButton>
          </form>
          <p className="center-note">
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
