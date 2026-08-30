import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import ProfilePhoto from "../../components/ProfilePhoto";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/directories";
import {
  addCredentialAction,
  addEducationAction,
  addExperienceAction,
  deleteCareerDocumentAction,
  deleteCredentialAction,
  deleteEducationAction,
  deleteExperienceAction,
  updateProfessionalProfileAction,
  uploadCareerDocumentAction,
  uploadProfessionalPhotoAction,
} from "./actions";

export const dynamic = "force-dynamic";

const eligibleRoles = new Set(["veterinarian", "professional", "candidate"]);

type ProfessionalProfile = {
  user_id: string;
  slug: string;
  professional_type: string;
  headline: string | null;
  public_summary: string | null;
  current_position: string | null;
  organization_name: string | null;
  years_experience: number;
  skills: string[];
  image_url: string | null;
  profile_visibility: string;
  verification_status: string;
};

type EducationRow = {
  id: string;
  degree: string;
  institution: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  visibility: string;
};

type ExperienceRow = {
  id: string;
  organization_name: string;
  designation: string;
  responsibilities: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  visibility: string;
  organization_source: string;
};

type CredentialRow = {
  id: string;
  credential_type: string;
  issuing_authority: string | null;
  credential_number: string | null;
  verification_status: string;
  visibility: string;
};

type CareerDocumentRow = {
  id: string;
  document_type: string;
  file_path: string;
  visibility: string;
  is_current: boolean;
  created_at: string;
  signed_url?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PK", {
    month: "short",
    year: "numeric",
  });
}

function visibilityLabel(value: string) {
  if (value === "public") return "Public";
  if (value === "registered_users") return "Registered users";
  if (value === "authorized_company") return "Approved recruiters";
  return "Private";
}

export default async function ProfessionalWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const messages = await searchParams;
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/professional");
  if (!identity.roles.some((role) => eligibleRoles.has(role))) {
    redirect("/dashboard?error=Professional%20workspace%20is%20not%20available%20for%20this%20account.");
  }

  const supabase = await createClient();
  const [profileResult, educationResult, experienceResult, credentialResult, documentResult] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("user_id, slug, professional_type, headline, public_summary, current_position, organization_name, years_experience, skills, image_url, profile_visibility, verification_status")
      .eq("user_id", identity.userId)
      .maybeSingle(),
    supabase
      .from("professional_education")
      .select("id, degree, institution, field_of_study, start_date, end_date, is_current, visibility")
      .eq("professional_user_id", identity.userId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
    supabase
      .from("professional_experience")
      .select("id, organization_name, designation, responsibilities, start_date, end_date, is_current, visibility, organization_source")
      .eq("professional_user_id", identity.userId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
    supabase
      .from("professional_credentials")
      .select("id, credential_type, issuing_authority, credential_number, verification_status, visibility")
      .eq("professional_user_id", identity.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("career_documents")
      .select("id, document_type, file_path, visibility, is_current, created_at")
      .eq("professional_user_id", identity.userId)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data as ProfessionalProfile | null;
  const education = (educationResult.data ?? []) as EducationRow[];
  const experience = (experienceResult.data ?? []) as ExperienceRow[];
  const credentials = (credentialResult.data ?? []) as CredentialRow[];
  const documents = (documentResult.data ?? []) as CareerDocumentRow[];

  const signedDocuments = await Promise.all(
    documents.map(async (document) => {
      const { data } = await supabase.storage
        .from("career-documents")
        .createSignedUrl(document.file_path, 60 * 15);
      return { ...document, signed_url: data?.signedUrl ?? null };
    }),
  );

  const completionChecks = [
    Boolean(profile?.image_url),
    Boolean(profile?.headline),
    Boolean(profile?.public_summary),
    Boolean(profile?.current_position),
    education.length > 0,
    experience.length > 0,
    credentials.length > 0,
    signedDocuments.length > 0,
  ];
  const completion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  const errors = [
    profileResult.error,
    educationResult.error,
    experienceResult.error,
    credentialResult.error,
    documentResult.error,
  ].filter(Boolean);

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">PROFESSIONAL WORKSPACE</span>
            <h1>Build your VetConnect professional identity.</h1>
            <p>Profile, experience, education, credentials and career documents in one verified record.</p>
          </div>
          <div className="dashboard-actions">
            {profile?.slug && profile.profile_visibility === "public" && (
              <Link className="button button-secondary" href={`/professionals/${profile.slug}`}>
                View public profile
              </Link>
            )}
            <Link className="button button-secondary" href="/dashboard/career">Career workspace</Link>
            <Link className="button button-dark" href="/dashboard">Account dashboard</Link>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />
          {errors.length > 0 && (
            <div className="form-message form-message-error">
              {errors[0]?.message}
            </div>
          )}

          <div className="professional-workspace-overview">
            <article className="professional-photo-card">
              <div className="professional-photo-large">
                <ProfilePhoto
                  imageUrl={profile?.image_url ?? null}
                  name={identity.profile?.full_name || identity.email}
                  fallback={initials(identity.profile?.full_name || identity.email)}
                />
              </div>
              <div>
                <span className="section-kicker">PROFILE PHOTO</span>
                <h2>{identity.profile?.full_name || identity.email}</h2>
                <p>{profile?.headline || profile?.professional_type || "Professional profile"}</p>
                <div className="status-cluster">
                  <span className={`status-pill status-${profile?.verification_status ?? "pending"}`}>
                    {profile?.verification_status ?? "pending"}
                  </span>
                  <span className="status-pill">{completion}% complete</span>
                </div>
              </div>
            </article>

            <form className="backend-form-card professional-photo-upload" action={uploadProfessionalPhotoAction}>
              <label htmlFor="photo">Upload profile photograph</label>
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
              <p className="form-help">JPG, PNG or WebP. Maximum 5 MB. Use a clear professional photograph.</p>
              <FormSubmitButton pendingLabel="Uploading photo...">Upload photograph</FormSubmitButton>
            </form>
          </div>

          <form className="backend-form-card workspace-section-card" action={updateProfessionalProfileAction}>
            <div className="section-heading">
              <span className="section-kicker">ABOUT</span>
              <h2>Professional headline and summary.</h2>
              <p>This information forms the top section of your public professional profile.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="professional_type">Professional type</label>
                <input id="professional_type" name="professional_type" defaultValue={profile?.professional_type ?? "Animal Health Professional"} required />
              </div>
              <div>
                <label htmlFor="years_experience">Years of experience</label>
                <input id="years_experience" name="years_experience" type="number" min="0" max="80" defaultValue={profile?.years_experience ?? 0} />
              </div>
              <div className="form-span-2">
                <label htmlFor="headline">Professional headline</label>
                <input id="headline" name="headline" defaultValue={profile?.headline ?? ""} placeholder="Example: Poultry veterinarian | Flock health, biosecurity and diagnostics" />
              </div>
              <div>
                <label htmlFor="current_position">Current position</label>
                <input id="current_position" name="current_position" defaultValue={profile?.current_position ?? ""} />
              </div>
              <div>
                <label htmlFor="organization_name">Current organization</label>
                <input id="organization_name" name="organization_name" defaultValue={profile?.organization_name ?? ""} />
              </div>
              <div className="form-span-2">
                <label htmlFor="skills">Skills</label>
                <input id="skills" name="skills" defaultValue={profile?.skills?.join(", ") ?? ""} placeholder="Poultry health, vaccination, biosecurity, diagnostics" />
                <p className="form-help">Separate skills with commas.</p>
              </div>
              <div className="form-span-2">
                <label htmlFor="public_summary">About / professional summary</label>
                <textarea id="public_summary" name="public_summary" defaultValue={profile?.public_summary ?? ""} placeholder="Summarize your professional background, areas of work and experience." />
              </div>
              <div>
                <label htmlFor="profile_visibility">Profile visibility</label>
                <select id="profile_visibility" name="profile_visibility" defaultValue={profile?.profile_visibility ?? "owner_only"}>
                  <option value="owner_only">Only me</option>
                  <option value="registered_users">Registered users</option>
                  <option value="authorized_company">Approved recruiters</option>
                  <option value="public">Public directory</option>
                </select>
              </div>
            </div>
            <FormSubmitButton pendingLabel="Saving profile...">Save professional profile</FormSubmitButton>
          </form>

          <div className="workspace-two-column">
            <section className="backend-form-card workspace-section-card">
              <div className="section-heading">
                <span className="section-kicker">EXPERIENCE</span>
                <h2>Employment and professional experience.</h2>
              </div>
              <div className="workspace-record-list">
                {experience.length === 0 ? <p>No experience records yet.</p> : experience.map((row) => (
                  <article key={row.id}>
                    <div>
                      <h3>{row.designation}</h3>
                      <p><b>{row.organization_name}</b></p>
                      <p>{formatDate(row.start_date)} – {row.is_current ? "Present" : formatDate(row.end_date)}</p>
                      {row.responsibilities && <p>{row.responsibilities}</p>}
                      <div className="status-cluster"><span className="status-pill">{visibilityLabel(row.visibility)}</span><span className="status-pill">{row.organization_source.replaceAll("_", " ")}</span></div>
                    </div>
                    <form action={deleteExperienceAction}><input type="hidden" name="id" value={row.id} /><button className="button button-secondary" type="submit">Remove</button></form>
                  </article>
                ))}
              </div>
              <form action={addExperienceAction} className="workspace-inline-form">
                <h3>Add experience</h3>
                <label>Organization<input name="organization_name" required /></label>
                <label>Designation<input name="designation" required /></label>
                <label>Responsibilities<textarea name="responsibilities" /></label>
                <div className="form-grid">
                  <label>Start date<input name="start_date" type="date" /></label>
                  <label>End date<input name="end_date" type="date" /></label>
                </div>
                <label className="checkbox-line"><input type="checkbox" name="is_current" /> Current position</label>
                <label>Visibility<select name="visibility" defaultValue="owner_only"><option value="owner_only">Private</option><option value="registered_users">Registered users</option><option value="authorized_company">Approved recruiters</option><option value="public">Public</option></select></label>
                <FormSubmitButton pendingLabel="Adding experience...">Add experience</FormSubmitButton>
              </form>
            </section>

            <section className="backend-form-card workspace-section-card">
              <div className="section-heading">
                <span className="section-kicker">EDUCATION</span>
                <h2>Degrees and academic training.</h2>
              </div>
              <div className="workspace-record-list">
                {education.length === 0 ? <p>No education records yet.</p> : education.map((row) => (
                  <article key={row.id}>
                    <div>
                      <h3>{row.degree}</h3>
                      <p><b>{row.institution || "Institution not listed"}</b></p>
                      {row.field_of_study && <p>{row.field_of_study}</p>}
                      <p>{formatDate(row.start_date)} – {row.is_current ? "Present" : formatDate(row.end_date)}</p>
                      <span className="status-pill">{visibilityLabel(row.visibility)}</span>
                    </div>
                    <form action={deleteEducationAction}><input type="hidden" name="id" value={row.id} /><button className="button button-secondary" type="submit">Remove</button></form>
                  </article>
                ))}
              </div>
              <form action={addEducationAction} className="workspace-inline-form">
                <h3>Add education</h3>
                <label>Degree / qualification<input name="degree" required /></label>
                <label>Institution<input name="institution" /></label>
                <label>Field of study<input name="field_of_study" /></label>
                <div className="form-grid">
                  <label>Start date<input name="start_date" type="date" /></label>
                  <label>End date<input name="end_date" type="date" /></label>
                </div>
                <label className="checkbox-line"><input type="checkbox" name="is_current" /> Currently studying</label>
                <label>Visibility<select name="visibility" defaultValue="owner_only"><option value="owner_only">Private</option><option value="registered_users">Registered users</option><option value="authorized_company">Approved recruiters</option><option value="public">Public</option></select></label>
                <FormSubmitButton pendingLabel="Adding education...">Add education</FormSubmitButton>
              </form>
            </section>
          </div>

          <div className="workspace-two-column">
            <section className="backend-form-card workspace-section-card">
              <div className="section-heading"><span className="section-kicker">CREDENTIALS</span><h2>Licences, certificates and memberships.</h2></div>
              <div className="workspace-record-list">
                {credentials.length === 0 ? <p>No credentials yet.</p> : credentials.map((row) => (
                  <article key={row.id}>
                    <div><h3>{row.credential_type}</h3><p>{row.issuing_authority || "Issuing authority not listed"}</p>{row.credential_number && <p>Reference: {row.credential_number}</p>}<div className="status-cluster"><span className={`status-pill status-${row.verification_status}`}>{row.verification_status}</span><span className="status-pill">{visibilityLabel(row.visibility)}</span></div></div>
                    <form action={deleteCredentialAction}><input type="hidden" name="id" value={row.id} /><button className="button button-secondary" type="submit">Remove</button></form>
                  </article>
                ))}
              </div>
              <form action={addCredentialAction} className="workspace-inline-form">
                <h3>Add credential</h3>
                <label>Credential type<input name="credential_type" placeholder="PVMC registration, certificate, membership" required /></label>
                <label>Issuing authority<input name="issuing_authority" /></label>
                <label>Credential / reference number<input name="credential_number" /></label>
                <label>Visibility<select name="visibility" defaultValue="owner_only"><option value="owner_only">Private</option><option value="registered_users">Registered users</option><option value="authorized_company">Approved recruiters</option><option value="public">Public after approval</option></select></label>
                <FormSubmitButton pendingLabel="Submitting credential...">Add credential</FormSubmitButton>
              </form>
            </section>

            <section className="backend-form-card workspace-section-card">
              <div className="section-heading"><span className="section-kicker">CAREER DOCUMENTS</span><h2>CV and supporting documents.</h2><p>Files are stored privately. Links below expire automatically.</p></div>
              <div className="workspace-record-list">
                {signedDocuments.length === 0 ? <p>No career documents uploaded.</p> : signedDocuments.map((row) => (
                  <article key={row.id}>
                    <div><h3>{row.document_type.toUpperCase()}</h3><p>Uploaded {new Date(row.created_at).toLocaleDateString("en-PK")}</p><span className="status-pill">{visibilityLabel(row.visibility)}</span></div>
                    <div className="card-actions">{row.signed_url && <a className="button button-secondary" href={row.signed_url} target="_blank" rel="noreferrer">Open</a>}<form action={deleteCareerDocumentAction}><input type="hidden" name="id" value={row.id} /><button className="button button-secondary" type="submit">Remove</button></form></div>
                  </article>
                ))}
              </div>
              <form action={uploadCareerDocumentAction} className="workspace-inline-form">
                <h3>Upload document</h3>
                <label>Document type<select name="document_type" defaultValue="cv"><option value="cv">CV / Resume</option><option value="cover_letter">Cover letter</option><option value="portfolio">Portfolio</option><option value="certificate_bundle">Certificate bundle</option></select></label>
                <label>File<input name="document" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required /></label>
                <label>Visibility<select name="visibility" defaultValue="owner_only"><option value="owner_only">Private</option><option value="authorized_company">Approved recruiters</option><option value="registered_users">Registered users</option></select></label>
                <FormSubmitButton pendingLabel="Uploading document...">Upload document</FormSubmitButton>
              </form>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
