import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { updatePasswordAction } from "../auth/actions";

export default async function UpdatePasswordPage({
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
          <form className="auth-card" action={updatePasswordAction}>
            <span className="section-kicker">SECURE ACCOUNT</span>
            <h2>Choose a new password</h2>
            <p>Use at least eight characters.</p>
            <FormMessage {...params} />
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <label htmlFor="confirm_password">Confirm new password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <FormSubmitButton pendingLabel="Updating...">
              Update password
            </FormSubmitButton>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
