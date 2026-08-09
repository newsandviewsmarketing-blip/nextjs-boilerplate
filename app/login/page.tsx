import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { requestLoginOtpAction } from "../auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="auth-shell">
          <div className="auth-info">
            <span className="section-kicker">WELCOME BACK</span>
            <h1>Sign in to your VetConnect account.</h1>
            <p>
              One secure account connects your professional profile, company,
              jobs and platform services.
            </p>
            <div className="auth-roles">
              <span>User / Farmer / Pet Owner</span>
              <span>Veterinarian</span>
              <span>Company / Employer</span>
              <span>Student / Candidate</span>
            </div>
          </div>
          <form className="auth-card" action={requestLoginOtpAction}>
            <span className="section-kicker">SECURE EMAIL OTP</span>
            <h2>Login</h2>
            <p>We will send a six-digit verification code to your email.</p>
            <FormMessage error={params.error} message={params.message} />
            <input
              type="hidden"
              name="next"
              value={params.next ?? "/dashboard"}
            />
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <div className="form-inline-note">
              Authentication emails are sent by VetConnect Pakistan. Check your
              spam folder if the message is delayed.
            </div>
            <FormSubmitButton pendingLabel="Sending code...">
              Send verification code
            </FormSubmitButton>
            <p className="auth-bottom">
              Don&apos;t have an account?{" "}
              <Link href="/register">Create account</Link>
            </p>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
