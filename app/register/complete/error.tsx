"use client";

export default function RegistrationCompletionError({ reset }: { reset: () => void }) {
  return <main className="auth-section">
    <section className="shell backend-form-card" role="alert">
      <h1>Registration could not be opened</h1>
      <p>Try again, or sign in with the same email to continue. If this keeps happening, contact VetConnect support. Do not create another account to retry this step.</p>
      <button type="button" className="button button-primary" onClick={reset}>Try again</button>
      <p><a href="/login?next=/register/complete">Return to sign in</a></p>
      <p><a href="mailto:vetconnect.official@gmail.com">Contact VetConnect support</a></p>
    </section>
  </main>;
}
