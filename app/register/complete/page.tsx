import { saveRegistrationProfileDraftAction } from "./actions";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import RegistrationEvidenceForm from "./RegistrationEvidenceForm";
import { createClient } from "@/lib/supabase/server";
import { registrationEvidenceRequirements } from "@/lib/registration-evidence";

export default async function CompleteRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/register/complete");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("primary_role").eq("id", auth.user.id).maybeSingle();
  const role = profile?.primary_role ?? "";
  const { data: gate, error: gateError } = await supabase.from("registration_completion_gate")
    .select("registration_intent, student_track, completed_at, review_status, cnic_number").eq("user_id", auth.user.id).maybeSingle();
  const requirements = registrationEvidenceRequirements(role, gate?.registration_intent ?? "", gate?.student_track ?? "");
  const existing = await supabase.from("registration_evidence")
    .select("document_type,original_filename,verification_status,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false });
  if (!profileError && !gateError && gate?.review_status === "approved") redirect("/dashboard");
  if (!profileError && !gateError && gate?.completed_at && gate?.review_status === "pending") redirect("/register/status");

  const registrationReady = Boolean(profile && gate && !profileError && !gateError && !existing.error);
  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="shell">
          <div className="backend-form-card vc-register-specific">
            <div className="section-heading">
              <span className="section-kicker">IDENTITY AND CREDENTIAL CHECK</span>
              <h1>Complete your registration</h1>
              <p>Upload your CNIC and the documents required for your selected category. Files are saved privately as you upload them. Nothing becomes public until an administrator approves your application.</p>
            </div>
            <FormMessage error={!registrationReady ? "Registration completion is temporarily unavailable. Please contact VetConnect support, then sign in with the same email to continue. Do not upload identity documents until this step is available." : params.error} />
            {registrationReady && ["veterinarian", "candidate", "professional"].includes(role) && <form action={saveRegistrationProfileDraftAction} className="backend-form-card">
              <h2>Saved professional experience</h2>
              <p>Review or update these details before submitting. Use Save draft to keep changes with your verified account.</p>
              {params.message && <p role="status">{params.message}</p>}
              <div className="form-grid">
                {[ ["experience_years", "Years of experience"], ["current_designation", "Current designation / role"], ["current_workplace", "Current workplace / institution"] ].map(([name,label]) => <div key={name}><label htmlFor={name}>{label}</label><input id={name} name={name} type={name === "experience_years" ? "number" : "text"} min={name === "experience_years" ? 0 : undefined} max={name === "experience_years" ? 80 : undefined} maxLength={180} defaultValue={String(auth.user?.user_metadata?.[name] ?? "")} /></div>)}
                <div><label htmlFor="professional_summary">Professional summary</label><textarea id="professional_summary" name="professional_summary" maxLength={250} defaultValue={String(auth.user.user_metadata?.professional_summary ?? "")} /></div>
              </div>
              <button type="submit" className="button button-primary">Save professional draft</button>
            </form>}
            {registrationReady && <RegistrationEvidenceForm requirements={requirements} cnic={gate?.cnic_number ?? ""} saved={existing.data ?? []} />}
            <p className="form-help">Your CNIC and credential files are held for VetConnect identity and category verification. Do not submit another person’s documents.</p>
            <LinkBack />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function LinkBack() {
  return <p className="center-note"><a href="/login">Sign out and return to sign in</a></p>;
}
