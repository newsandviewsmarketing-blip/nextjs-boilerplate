import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { requestPasswordResetAction } from "../auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="single-form-shell">
          <form className="auth-card" action={requestPasswordResetAction}>
            <span className="section-kicker">ACCOUNT RECOVERY</span>
            <h2>Reset your password</h2>
            <p>Enter your registered email address.</p>
            <FormMessage {...params} />
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <FormSubmitButton pendingLabel="Sending...">
              Send reset email
            </FormSubmitButton>
            <p className="auth-bottom">
              <Link href="/login">Return to login</Link>
            </p>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
