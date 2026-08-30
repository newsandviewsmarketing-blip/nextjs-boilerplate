import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import MasterDataInput from "../../components/MasterDataInput";
import PakistanLocationFields from "../../components/PakistanLocationFields";
import AdminNav from "../components/AdminNav";
import PersistentForm from "./PersistentForm";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createManagedPersonAction, createCompanyAction, createClinicAction, createLaboratoryAction, createAdminProductAction, createAdminJobAction } from "./actions";
import { bulkImportAction } from "./bulk-actions";

export const dynamic = "force-dynamic";
type Kind = "person"|"company"|"clinic"|"laboratory"|"product"|"job";
type Params = { type?: Kind; error?: string; message?: string };

const tabs: Array<[Kind,string]> = [["person","Professional / Vet"],["company","Company"],["clinic","Clinic / Hospital"],["laboratory","Laboratory"],["product","Product"],["job","Job"]];

export default async function AdminCreatePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const identity = await requireAdminPermission("admin.view", "/admin/create");
  const kind: Kind = tabs.some(([value]) => value === params.type) ? (params.type as Kind) : "person";
  const supabase = await createClient();
  const { data: companies } = await supabase.from("companies").select("id, canonical_name, verification_status").eq("record_status","active").order("canonical_name");

  return <main><SiteHeader />
    <section className="dashboard-hero"><div className="shell"><span className="section-kicker">ASSISTED ENTRY CENTRE</span><h1>Staff can build records for people and businesses.</h1><p>A client login is not required to create a directory record. Records remain accountable to the staff member who entered them and can later be claimed/linked.</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout"><AdminNav roles={identity.roles}/><div className="admin-control-content">
      <FormMessage error={params.error} message={params.message}/>
      <div className="management-links assisted-entry-tabs">{tabs.map(([value,label]) => <a className={`button ${kind===value?"button-primary":"button-secondary"}`} href={`/admin/create?type=${value}`} key={value}>{label}</a>)}</div>

      {kind === "person" && <PersistentForm className="profile-form" action={createManagedPersonAction} storageKey="vetconnect-admin-create-person" clearSaved={Boolean(params.message)}>
        <div><label>Profile type</label><select name="profile_kind" required><option value="veterinarian">Veterinarian</option><option value="professional">Allied / Other Professional</option></select></div>
        <div><label>Full name</label><input name="full_name" required /></div>
        <div><label>Contact email (optional)</label><input name="contact_email" type="email" /></div><div><label>Public phone</label><input name="public_phone" /></div>
        <div><label>Qualifications</label><input name="qualifications" placeholder="DVM, MPhil, PhD" /></div><div><label>PVMC number (if veterinarian)</label><input name="pvmc_number" /></div>
        <MasterDataInput category="veterinary_sector" name="veterinary_sector" label="Veterinary sector" />
        <div><label>Specialization</label><input name="specialization" placeholder="Select/enter specialization" /></div>
        <div><label>Professional type</label><input name="professional_type" placeholder="Veterinarian / Nutritionist / Farm Manager" /></div><div><label>Headline</label><input name="headline" /></div>
        <div><label>Current position</label><input name="current_position" /></div><div><label>Organization</label><input name="organization_name" /></div>
        <div><label>Years experience</label><input name="years_experience" type="number" min="0" defaultValue="0" /></div><div><label>Image URL (optional fallback)</label><input name="image_url" type="url" /></div>
        <div><label>Upload profile photo</label><input name="profile_image" type="file" accept="image/jpeg,image/png,image/webp" /><p className="form-help">JPG, PNG or WebP, maximum 5 MB.</p></div>
        <div><label>CV / qualification document</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /><p className="form-help">Private admin evidence, maximum 10 MB.</p></div>
        <div className="form-span-2"><label>PVMC / credential evidence (veterinarian only)</label><input name="credential_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <div className="form-span-2"><label>Services (comma separated)</label><input name="services" placeholder="Farm visit, Vaccination, Disease diagnosis" /></div>
        <div className="form-span-2"><label>Skills (comma separated)</label><input name="skills" /></div>
        <PakistanLocationFields />
        <div className="form-span-2"><label>Address</label><input name="address" /></div><div className="form-span-2"><label>Google Maps URL</label><input name="google_maps_url" type="url" /></div>
        <div className="form-span-2"><label>Public summary</label><textarea name="public_summary" rows={4} /></div>
        <label className="checkbox-line form-span-2"><input type="checkbox" name="publish_now" /> Publish immediately (requires review permission; veterinarian also requires PVMC number)</label>
        <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create assisted profile</FormSubmitButton>
      </PersistentForm>}

      {kind === "company" && <PersistentForm className="profile-form" action={createCompanyAction} storageKey="vetconnect-admin-create-company" clearSaved={Boolean(params.message)}>
        <div><label>Company name</label><input name="canonical_name" required /></div><MasterDataInput category="business_type" name="business_type" label="Business type" />
        <div><label>Legal name</label><input name="legal_name" /></div><div><label>Trade name</label><input name="trade_name" /></div>
        <div><label>Public email</label><input name="public_email" type="email" /></div><div><label>Public phone</label><input name="public_phone" /></div>
        <div><label>Website</label><input name="website" /></div><div><label>Logo URL (optional fallback)</label><input name="logo_url" type="url" /></div>
        <div><label>Upload company logo</label><input name="logo_file" type="file" accept="image/jpeg,image/png,image/webp" /></div>
        <div><label>Registration / NTN evidence</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <PakistanLocationFields />
        <div className="form-span-2"><label>Address</label><input name="address" /></div><div className="form-span-2"><label>Google Maps URL</label><input name="google_maps_url" type="url" /></div>
        <div className="form-span-2"><label>Description</label><textarea name="description" rows={4} /></div>
        <label className="checkbox-line form-span-2"><input type="checkbox" name="publish_now" /> Approve and publish now (authorized directory admins only)</label>
        <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create company</FormSubmitButton>
      </PersistentForm>}

      {kind === "clinic" && <PersistentForm className="profile-form" action={createClinicAction} storageKey="vetconnect-admin-create-clinic" clearSaved={Boolean(params.message)}>
        <div><label>Clinic / hospital name</label><input name="clinic_name" required /></div><MasterDataInput category="facility_type" name="facility_type" label="Facility type" defaultValue="Veterinary Clinic" />
        <div><label>Public email</label><input name="public_email" type="email" /></div><div><label>Public phone</label><input name="public_phone" /></div><div><label>Website</label><input name="website" /></div><div><label>Working hours</label><input name="working_hours" /></div>
        <div><label>Upload clinic logo</label><input name="logo_file" type="file" accept="image/jpeg,image/png,image/webp" /></div><div><label>Upload cover photo</label><input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp" /></div>
        <div className="form-span-2"><label>Registration / licence evidence</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <PakistanLocationFields />
        <div className="form-span-2"><label>Address</label><input name="address" /></div><div className="form-span-2"><label>Google Maps URL</label><input name="google_maps_url" type="url" /></div>
        <div className="form-span-2"><label>Services (comma separated)</label><input name="services" /></div><div className="form-span-2"><label>Species (comma separated)</label><input name="species" /></div>
        <div className="form-span-2"><label>Description</label><textarea name="description" rows={4} /></div>
        <label className="checkbox-line"><input type="checkbox" name="emergency_service" /> Emergency service</label><label className="checkbox-line"><input type="checkbox" name="publish_now" /> Approve & publish</label>
        <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create clinic / hospital</FormSubmitButton>
      </PersistentForm>}

      {kind === "laboratory" && <PersistentForm className="profile-form" action={createLaboratoryAction} storageKey="vetconnect-admin-create-laboratory" clearSaved={Boolean(params.message)}>
        <div><label>Laboratory name</label><input name="laboratory_name" required /></div><MasterDataInput category="laboratory_type" name="laboratory_type" label="Laboratory type" defaultValue="Diagnostic Laboratory" />
        <div><label>Technical head</label><input name="technical_head" /></div><div><label>Working hours</label><input name="working_hours" /></div><div><label>Public email</label><input name="public_email" type="email" /></div><div><label>Public phone</label><input name="public_phone" /></div><div><label>Website</label><input name="website" /></div><div><label>Google Maps URL</label><input name="google_maps_url" type="url" /></div>
        <div><label>Upload laboratory logo</label><input name="logo_file" type="file" accept="image/jpeg,image/png,image/webp" /></div><div><label>Upload cover photo</label><input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp" /></div>
        <div className="form-span-2"><label>Accreditation / licence evidence</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <PakistanLocationFields />
        <div className="form-span-2"><label>Address</label><input name="address" /></div><div className="form-span-2"><label>Tests offered (comma separated)</label><input name="tests_offered" /></div><div className="form-span-2"><label>Species served (comma separated)</label><input name="species_served" /></div><div className="form-span-2"><label>Description</label><textarea name="description" rows={4} /></div>
        <label className="checkbox-line form-span-2"><input type="checkbox" name="publish_now" /> Approve & publish</label><FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create laboratory</FormSubmitButton>
      </PersistentForm>}

      {kind === "product" && <PersistentForm className="profile-form" action={createAdminProductAction} storageKey="vetconnect-admin-create-product" clearSaved={Boolean(params.message)}>
        <div><label>Company</label><select name="company_id" required><option value="">Select company</option>{(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.canonical_name}</option>)}</select></div><div><label>Product name</label><input name="product_name" required /></div>
        <div><label>Brand name</label><input name="brand_name" /></div><div><label>Generic name</label><input name="generic_name" /></div>
        <MasterDataInput category="product_category" name="category" label="Category" required /><MasterDataInput category="veterinary_sector" name="sector" label="Sector" />
        <MasterDataInput category="product_dosage_form" name="dosage_form" label="Dosage form" /><MasterDataInput category="product_presentation" name="presentation" label="Presentation" />
        <MasterDataInput category="product_packaging" name="packaging_type" label="Packaging type" /><div><label>Pack size value</label><input name="pack_size_value" placeholder="100 / 500 / 1000" /></div>
        <MasterDataInput category="product_packaging" name="pack_size_unit" label="Pack size unit" /><MasterDataInput category="vaccine_type" name="vaccine_type" label="Vaccine type (if applicable)" />
        <div><label>Concentration value</label><input name="concentration_value" /></div><MasterDataInput category="concentration_unit" name="concentration_unit" label="Concentration unit" />
        <MasterDataInput category="administration_route" name="administration_route" label="Administration route" /><div><label>Legacy / multiple pack sizes</label><input name="pack_sizes" placeholder="100 ml, 500 ml, 1000 doses" /></div>
        <div className="form-span-2"><label>Composition</label><textarea name="composition" rows={2} /></div><div><label>Strength</label><input name="strength" /></div><div><label>Indications</label><input name="indications" /></div><div className="form-span-2"><label>Description</label><textarea name="description" rows={4} /></div>
        <div><label>Upload product image</label><input name="product_image" type="file" accept="image/jpeg,image/png,image/webp" /></div><div><label>Regulatory / supporting evidence</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create product draft</FormSubmitButton>
      </PersistentForm>}

      {kind === "job" && <PersistentForm className="profile-form" action={createAdminJobAction} storageKey="vetconnect-admin-create-job" clearSaved={Boolean(params.message)}>
        <div><label>Employer company</label><select name="company_id" required><option value="">Select company</option>{(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.canonical_name}</option>)}</select></div><div><label>Job title</label><input name="title" required /></div>
        <MasterDataInput category="job_sector" name="sector" label="Job sector" /><MasterDataInput category="employment_type" name="employment_type" label="Employment type" defaultValue="Full-time" />
        <PakistanLocationFields />
        <div className="form-span-2"><label>Address / workplace</label><input name="address" /></div><div><label>Minimum qualification</label><input name="minimum_qualification" /></div><div><label>Minimum experience (years)</label><input type="number" min="0" name="minimum_experience" defaultValue="0" /></div><div><label>Deadline</label><input type="date" name="deadline" /></div><div className="form-span-2"><label>Description</label><textarea name="description" rows={5} required /></div>
        <div className="form-span-2"><label>Supporting job document (optional)</label><input name="supporting_document" type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" /></div>
        <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Creating...">Create job draft</FormSubmitButton>
      </PersistentForm>}

      <section className="admin-import-panel">
        <div className="section-heading compact-heading"><span className="section-kicker">BULK IMPORT</span><h2>Import CSV or Excel records.</h2><p>Imported records enter the normal review workflow. Maximum 250 rows and 8 MB per file.</p></div>
        <form className="profile-form" action={bulkImportAction}>
          <input type="hidden" name="record_type" value={kind} />
          <div className="form-span-2"><label>CSV / XLSX file</label><input name="import_file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></div>
          <div className="form-span-2"><a className="button button-secondary" href={`/templates/${({person:"professionals-import-template.csv",company:"companies-import-template.csv",clinic:"clinics-import-template.csv",laboratory:"laboratories-import-template.csv",product:"products-import-template.csv",job:"jobs-import-template.csv"} as Record<Kind,string>)[kind]}`} download>Download editable CSV template</a></div>
          <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Importing...">Import records</FormSubmitButton>
        </form>
      </section>
    </div></div></section><SiteFooter /></main>;
}
