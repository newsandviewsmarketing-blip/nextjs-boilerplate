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
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/register/complete");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("primary_role").eq("id", auth.user.id).maybeSingle();
  const role = profile?.primary_role ?? "";
  const { data: gate, error: gateError } = await supabase.from("registration_completion_gate")
    .select("registration_intent, student_track, completed_at").eq("user_id", auth.user.id).maybeSingle();
  const requirements = registrationEvidenceRequirements(role, gate?.registration_intent ?? "", gate?.student_track ?? "");
  const existing = await supabase.from("registration_evidence")
    .select("document_type").eq("user_id", auth.user.id);
  const uploaded = new Set((existing.data ?? []).map((row) => row.document_type));
  const requiredTypes = [...requirements.map((item) => item.type), "cnic_front", "cnic_back"];
  if (!profileError && !gateError && gate?.completed_at) redirect("/dashboard");

  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="shell">
          <div className="backend-form-card vc-register-specific">
            <div className="section-heading">
              <span className="section-kicker">IDENTITY AND CREDENTIAL CHECK</span>
              <h1>Complete your registration</h1>
              <p>Upload your CNIC and the documents required for your selected category. Files are stored privately and remain pending verification.</p>
            </div>
            <FormMessage error={params.error || (profileError || existing.error || gateError ? "Private registration storage is not ready. Please contact VetConnect support." : undefined)} />
            <RegistrationEvidenceForm requirements={requirements} />
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
