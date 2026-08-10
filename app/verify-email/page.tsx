import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import {
  resendEmailOtpAction,
  verifyEmailOtpAction,
} from "../auth/actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    mode?: string;
    next?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const mode = params.mode === "register" ? "register" : "login";
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";

  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="single-form-shell">
          <form className="auth-card" action={verifyEmailOtpAction}>
            <span className="section-kicker">EMAIL VERIFICATION</span>
            <h1>Enter your verification code.</h1>
            <p>
              A code was sent to <b>{email || "your email address"}</b>.
            </p>
            <FormMessage error={params.error} message={params.message} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="next" value={next} />
            <label htmlFor="token">Six-digit code</label>
            <input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              minLength={6}
              maxLength={10}
              pattern="[0-9]{6,10}"
              placeholder="000000"
              required
            />
            <FormSubmitButton pendingLabel="Verifying...">
              Verify and continue
            </FormSubmitButton>
          </form>
          <form className="resend-form" action={resendEmailOtpAction}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="next" value={next} />
            <FormSubmitButton
              className="button button-secondary"
              pendingLabel="Sending..."
            >
              Resend code
            </FormSubmitButton>
            <Link href={mode === "register" ? "/register" : "/login"}>
              Use another email
            </Link>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
