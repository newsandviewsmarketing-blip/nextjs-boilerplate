import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { requestRegistrationOtpAction } from "../auth/actions";
import { isAllowedSelfRegistrationRole } from "@/lib/auth";
import RegistrationDetails from "./RegistrationDetails";

const roles = [
  [
    "veterinarian",
    "Registered Veterinarian (DVM / PVMC)",
    "Choose only if you hold a DVM or recognized veterinary qualification. Practice verification requires a valid PVMC record.",
  ],
  [
    "company",
    "Company / Employer",
    "Business profile, products, jobs and company verification.",
  ],
  [
    "candidate",
    "Veterinary Student / Job Seeker",
    "Students and trainees are not shown as licensed veterinary practitioners; use this pathway for career development.",
  ],
  [
    "professional",
    "Livestock / Allied Industry Professional",
    "Nutrition, dairy, livestock, farm management, laboratory, research and technical professionals. This is not a veterinary practice licence.",
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
  searchParams: Promise<{
    role?: string;
    intent?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;

  const clinicIntent = params.intent === "clinic";

  const selectedRole = clinicIntent
    ? "company"
    : params.role && isAllowedSelfRegistrationRole(params.role)
      ? params.role
      : "";

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
                className={
                  selectedRole === role[0] && !clinicIntent
                    ? "selected-role-card"
                    : ""
                }
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

          {selectedRole ? <form
            id="registration"
            className="backend-form-card vc-register-specific"
            action={requestRegistrationOtpAction}
          >
            <div className="section-heading">
              <span className="section-kicker">SELECTED REGISTRATION PATHWAY</span>
              <h2>{clinicIntent ? "Clinic / Veterinary Hospital" : roles.find(item=>item[0]===selectedRole)?.[1]} registration</h2>
              <p>Only fields relevant to your category are shown. Choose another card above to change your registration pathway. After email confirmation, upload your CNIC and the documents required for this category to complete registration.</p>
            </div>
            <FormMessage error={params.error} message={params.message}/>
            <input type="hidden" name="role" value={selectedRole}/>
            {clinicIntent&&<input type="hidden" name="registration_intent" value="clinic"/>}
            <div className="form-grid">
              <div><label htmlFor="full_name">{clinicIntent?"Clinic owner / authorized representative *":"Full name *"}</label><input id="full_name" name="full_name" autoComplete="name" required maxLength={120}/></div>
              <div><label htmlFor="email">Email address *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>
              <div><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={35}/></div>
              <div><label htmlFor="city">City / town</label><input id="city" name="city" autoComplete="address-level2" maxLength={120}/></div>
              <RegistrationDetails role={selectedRole} clinic={clinicIntent}/>
            </div>
            <p className="form-help">Email confirmation is the first step. Your registration remains incomplete until you upload your CNIC and category-specific identity, degree, licence, or business evidence. Files are collected in a private verification area and are not shown on public profiles.</p>
            <FormSubmitButton pendingLabel="Sending code...">Send registration code</FormSubmitButton>
          </form> : <section id="registration" className="backend-form-card vc-register-choice" aria-labelledby="select-path-heading">
            <span className="section-kicker">FIRST STEP</span>
            <h2 id="select-path-heading">Select your registration category above</h2>
            <p>Veterinarians, veterinary students, allied professionals, employers, clinics, laboratories and customers have different registration fields. No category is chosen automatically.</p>
          </section>}

          <p className="center-note">
            Already registered? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
