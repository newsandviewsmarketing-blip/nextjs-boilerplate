import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { registrationEvidenceRequirements } from "@/lib/registration-evidence";
import { completeRegistrationAction } from "./actions";

const accepted = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

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
  const intent = auth.user.user_metadata?.registration_intent === "clinic" ? "clinic" : "";
  const track = typeof auth.user.user_metadata?.student_track === "string" ? auth.user.user_metadata.student_track : "";
  const requirements = registrationEvidenceRequirements(role, intent, track);
  const existing = await supabase.from("registration_evidence")
    .select("document_type").eq("user_id", auth.user.id);
  const uploaded = new Set((existing.data ?? []).map((row) => row.document_type));
  const requiredTypes = [...requirements.map((item) => item.type), "cnic_front", "cnic_back"];
  if (!profileError && !existing.error && requiredTypes.every((type) => uploaded.has(type))) redirect("/dashboard");

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
            <FormMessage error={params.error || (profileError || existing.error ? "Private registration storage is not ready. Please contact VetConnect support." : undefined)} />
            <form action={completeRegistrationAction}>
              <div className="form-grid">
                <div><label htmlFor="cnic-number">CNIC number *</label><input id="cnic-number" name="cnic_number" required inputMode="numeric" autoComplete="off" placeholder="12345-1234567-1" pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" maxLength={15}/></div>
                <div><label htmlFor="cnic-front">CNIC front *</label><input id="cnic-front" name="cnic_front" type="file" accept={accepted} required/></div>
                <div><label htmlFor="cnic-back">CNIC back *</label><input id="cnic-back" name="cnic_back" type="file" accept={accepted} required/></div>
                {requirements.map((item) => <div key={item.type}><label htmlFor={item.type}>{item.label} *</label><input id={item.type} name={item.type} type="file" accept={accepted} required/></div>)}
              </div>
              <p className="form-help">Maximum 8 MB per file. Accepted formats: PDF, JPG, PNG and WebP. Uploaded evidence is private and not displayed on your public profile.</p>
              <FormSubmitButton pendingLabel="Uploading securely...">Submit registration documents</FormSubmitButton>
            </form>
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
