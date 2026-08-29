import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { productCategories } from "@/lib/marketplace";
import {
  createJobAction,
  createProductAction,
  deletePendingJobAction,
  deletePendingProductAction,
  updateCompanyProfileAction,
  updateInquiryStatusAction,
} from "./actions";
import {
  getCurrentCompanyWorkspace,
  workspaceHasPermission,
} from "./workspace";

export const dynamic = "force-dynamic";

type CompanyProfileRow = {
  company_name: string;
  legal_name: string | null;
  trade_name: string | null;
  business_type: string | null;
  registration_number: string | null;
  owner_name: string | null;
  chief_executive_name: string | null;
  year_established: number | null;
  country: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  short_description: string | null;
  website: string | null;
  contact_email: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  product_name: string;
  category: string;
  verification_status: string;
  rejection_reason: string | null;
  is_published: boolean;
  created_at: string;
};

type InquiryRow = {
  id: string;
  product_id: string;
  inquiry_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  organization: string | null;
  message: string;
  status: string;
  created_at: string;
};

type JobRow = {
  id: string;
  slug: string;
  title: string;
  sector: string | null;
  city: string | null;
  employment_type: string;
  verification_status: string;
  is_published: boolean;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_user_id: string;
  status: string;
  applied_at: string;
};

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function permissionLabel(permission: string) {
  return permission
    .replace("company.", "Company: ")
    .replace("products.", "Products: ")
    .replace("jobs.", "Jobs: ")
    .replace("applicants.", "Applicants: ")
    .replace("members.", "Members: ")
    .replace(/_/g, " ");
}

export default async function CompanyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase, workspace } = await getCurrentCompanyWorkspace();

  const canManageCompany = workspaceHasPermission(workspace, "company.manage");
  const canViewPrivateCompany = workspaceHasPermission(
    workspace,
    "company.view_private",
  );
  const canManageProducts = workspaceHasPermission(workspace, "products.manage");
  const canManageJobs = workspaceHasPermission(workspace, "jobs.manage");
  const canManageApplicants = workspaceHasPermission(
    workspace,
    "applicants.manage",
  );
  const canManageMembers = workspaceHasPermission(workspace, "members.manage");

  let company: CompanyProfileRow | null = null;
  let productRows: ProductRow[] = [];
  let inquiryRows: InquiryRow[] = [];
  let jobRows: JobRow[] = [];
  let applicationRows: ApplicationRow[] = [];

  if (canManageCompany || canViewPrivateCompany) {
    const { data, error } = await supabase
      .from("company_profiles")
      .select(
        "company_name, legal_name, trade_name, business_type, registration_number, owner_name, chief_executive_name, year_established, country, city, address, description, short_description, website, contact_email, logo_url, cover_image_url, verification_status, rejection_reason",
      )
      .eq("user_id", workspace.legacy_company_user_id)
      .maybeSingle();

    if (error) {
      redirect(`/dashboard/company?error=${encodeURIComponent(error.message)}`);
    }

    company = data as CompanyProfileRow | null;
  }

  if (canManageProducts) {
    const [{ data: products, error: productsError }, { data: inquiries, error: inquiriesError }] =
      await Promise.all([
        supabase
          .from("products")
          .select(
            "id, slug, product_name, category, verification_status, rejection_reason, is_published, created_at",
          )
          .eq("company_user_id", workspace.legacy_company_user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_inquiries")
          .select(
            "id, product_id, inquiry_type, contact_name, contact_email, contact_phone, organization, message, status, created_at",
          )
          .eq("company_user_id", workspace.legacy_company_user_id)
          .order("created_at", { ascending: false }),
      ]);

    if (productsError) {
      redirect(`/dashboard/company?error=${encodeURIComponent(productsError.message)}`);
    }
    if (inquiriesError) {
      redirect(`/dashboard/company?error=${encodeURIComponent(inquiriesError.message)}`);
    }

    productRows = (products ?? []) as ProductRow[];
    inquiryRows = (inquiries ?? []) as InquiryRow[];
  }

  if (canManageJobs) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, slug, title, sector, city, employment_type, verification_status, is_published, created_at",
      )
      .eq("company_id", workspace.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      redirect(`/dashboard/company?error=${encodeURIComponent(error.message)}`);
    }

    jobRows = (data ?? []) as JobRow[];
  }

  if (canManageApplicants) {
    const { data, error } = await supabase
      .from("job_applications")
      .select("id, job_id, candidate_user_id, status, applied_at")
      .order("applied_at", { ascending: false })
      .limit(25);

    if (error) {
      redirect(`/dashboard/company?error=${encodeURIComponent(error.message)}`);
    }

    applicationRows = (data ?? []) as ApplicationRow[];
  }

  const productMap = new Map(
    productRows.map((product) => [product.id, product]),
  );
  const jobMap = new Map(jobRows.map((job) => [job.id, job]));
  const approved = workspace.company_verification_status === "approved";
  const displayName = company?.company_name || workspace.canonical_name;
  const grantedPermissions = workspace.permissions ?? [];
  const hasOperationalAccess =
    canManageCompany ||
    canManageProducts ||
    canManageJobs ||
    canManageApplicants ||
    canManageMembers;

  return (
    <main>
      <SiteHeader />

      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">COMPANY WORKSPACE</span>
            <h1>{displayName}</h1>
            <p>
              {roleLabel(workspace.member_role)}
              {workspace.designation ? ` · ${workspace.designation}` : ""}
            </p>
          </div>
          <Link className="button button-secondary" href="/dashboard">
            Account profile
          </Link>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...params} />

          <div className="backend-form-card">
            <div className="section-heading">
              <span className="section-kicker">WORKSPACE ACCESS</span>
              <h2>{roleLabel(workspace.member_role)}</h2>
              <p>
                Access is controlled by the approved company membership and
                server-side database permissions.
              </p>
            </div>
            <div className="management-links">
              {workspace.member_role === "owner" ? (
                <span className="status-pill">Owner access</span>
              ) : grantedPermissions.length > 0 ? (
                grantedPermissions.map((permission) => (
                  <span className="status-pill" key={permission}>
                    {permissionLabel(permission)}
                  </span>
                ))
              ) : (
                <span className="status-pill">No operational permissions</span>
              )}
            </div>
          </div>

          {!approved && (
            <div className="setup-notice">
              <h2>Company approval is required.</h2>
              <p>
                Product and job submissions remain unavailable until the
                canonical company record is approved by VetConnect.
              </p>
              {company?.rejection_reason && (
                <p>
                  <b>Review note:</b> {company.rejection_reason}
                </p>
              )}
            </div>
          )}

          {!hasOperationalAccess && (
            <div className="setup-notice">
              <h2>Workspace access is limited.</h2>
              <p>
                Your company membership is active, but no management permission
                has been assigned to this account.
              </p>
            </div>
          )}

          <div className="admin-summary company-summary">
            {canManageProducts && (
              <>
                <article>
                  <b>{productRows.length}</b>
                  <span>Total products</span>
                </article>
                <article>
                  <b>
                    {
                      productRows.filter(
                        (item) => item.verification_status === "approved",
                      ).length
                    }
                  </b>
                  <span>Approved products</span>
                </article>
                <article>
                  <b>{inquiryRows.length}</b>
                  <span>Information requests</span>
                </article>
              </>
            )}
            {canManageJobs && (
              <article>
                <b>{jobRows.length}</b>
                <span>Job posts</span>
              </article>
            )}
            {canManageApplicants && (
              <article>
                <b>{applicationRows.length}</b>
                <span>Recent applications</span>
              </article>
            )}
          </div>

          {canManageCompany && (
            <form className="backend-form-card" action={updateCompanyProfileAction}>
              <div className="section-heading">
                <span className="section-kicker">COMPANY PROFILE</span>
                <h2>Edit company information.</h2>
                <p>
                  Changes remain protected by the company.manage permission and
                  database review rules.
                </p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="company_name">Company name</label>
                  <input
                    id="company_name"
                    name="company_name"
                    required
                    defaultValue={company?.company_name ?? workspace.canonical_name}
                  />
                </div>
                <div>
                  <label htmlFor="legal_name">Legal name</label>
                  <input id="legal_name" name="legal_name" defaultValue={company?.legal_name ?? ""} />
                </div>
                <div>
                  <label htmlFor="trade_name">Trade name</label>
                  <input id="trade_name" name="trade_name" defaultValue={company?.trade_name ?? ""} />
                </div>
                <div>
                  <label htmlFor="business_type">Business type</label>
                  <input id="business_type" name="business_type" defaultValue={company?.business_type ?? ""} />
                </div>
                <div>
                  <label htmlFor="registration_number">Registration number</label>
                  <input id="registration_number" name="registration_number" defaultValue={company?.registration_number ?? ""} />
                </div>
                <div>
                  <label htmlFor="owner_name">Owner name</label>
                  <input id="owner_name" name="owner_name" defaultValue={company?.owner_name ?? ""} />
                </div>
                <div>
                  <label htmlFor="chief_executive_name">Chief executive</label>
                  <input id="chief_executive_name" name="chief_executive_name" defaultValue={company?.chief_executive_name ?? ""} />
                </div>
                <div>
                  <label htmlFor="year_established">Year established</label>
                  <input id="year_established" name="year_established" type="number" min="1800" max={new Date().getFullYear()} defaultValue={company?.year_established ?? ""} />
                </div>
                <div>
                  <label htmlFor="country">Country</label>
                  <input id="country" name="country" defaultValue={company?.country ?? "Pakistan"} />
                </div>
                <div>
                  <label htmlFor="city">City</label>
                  <input id="city" name="city" defaultValue={company?.city ?? ""} />
                </div>
                <div className="form-span-2">
                  <label htmlFor="address">Address</label>
                  <input id="address" name="address" defaultValue={company?.address ?? ""} />
                </div>
                <div className="form-span-2">
                  <label htmlFor="short_description">Short description</label>
                  <input id="short_description" name="short_description" defaultValue={company?.short_description ?? ""} />
                </div>
                <div className="form-span-2">
                  <label htmlFor="description">Company description</label>
                  <textarea id="description" name="description" defaultValue={company?.description ?? ""} />
                </div>
                <div>
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="url" defaultValue={company?.website ?? ""} />
                </div>
                <div>
                  <label htmlFor="contact_email">Contact email</label>
                  <input id="contact_email" name="contact_email" type="email" defaultValue={company?.contact_email ?? ""} />
                </div>
                <div>
                  <label htmlFor="logo_url">Logo URL</label>
                  <input id="logo_url" name="logo_url" type="url" defaultValue={company?.logo_url ?? ""} />
                </div>
                <div>
                  <label htmlFor="cover_image_url">Cover image URL</label>
                  <input id="cover_image_url" name="cover_image_url" type="url" defaultValue={company?.cover_image_url ?? ""} />
                </div>
              </div>
              <FormSubmitButton pendingLabel="Saving company...">
                Save company profile
              </FormSubmitButton>
            </form>
          )}

          {canManageProducts && (
            <div className="company-workspace-grid">
              <form className="backend-form-card" action={createProductAction}>
                <div className="section-heading">
                  <span className="section-kicker">PRODUCT SUBMISSION</span>
                  <h2>Add a structured product.</h2>
                  <p>Every submission stays pending until administrator approval.</p>
                </div>
                <fieldset disabled={!approved}>
                  <div className="form-grid">
                    <div><label htmlFor="product_name">Product name</label><input id="product_name" name="product_name" required /></div>
                    <div><label htmlFor="category">Category</label><select id="category" name="category" required defaultValue=""><option value="" disabled>Select category</option>{productCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
                    <div><label htmlFor="brand_name">Brand</label><input id="brand_name" name="brand_name" /></div>
                    <div><label htmlFor="generic_name">Generic name</label><input id="generic_name" name="generic_name" /></div>
                    <div><label htmlFor="product_code">Product code / SKU</label><input id="product_code" name="product_code" /></div>
                    <div><label htmlFor="subclass">Product subclass</label><input id="subclass" name="subclass" placeholder="Live vaccine, feed additive..." /></div>
                    <div><label htmlFor="therapeutic_class">Therapeutic / functional class</label><input id="therapeutic_class" name="therapeutic_class" /></div>
                    <div><label htmlFor="sectors">Sectors</label><input id="sectors" name="sectors" placeholder="Poultry, dairy, livestock" /></div>
                    <div><label htmlFor="species">Species</label><input id="species" name="species" placeholder="Chicken, cattle, buffalo" /></div>
                    <div><label htmlFor="production_systems">Production systems</label><input id="production_systems" name="production_systems" placeholder="Broiler, layer, breeder" /></div>
                    <div><label htmlFor="use_areas">Disease / use areas</label><input id="use_areas" name="use_areas" placeholder="Respiratory disease, gut health" /></div>
                    <div><label htmlFor="routes">Routes</label><input id="routes" name="routes" placeholder="Drinking water, spray, oral" /></div>
                    <div><label htmlFor="dosage_form">Dosage / product form</label><input id="dosage_form" name="dosage_form" /></div>
                    <div><label htmlFor="strength">Strength</label><input id="strength" name="strength" /></div>
                    <div><label htmlFor="pack_sizes">Pack sizes</label><input id="pack_sizes" name="pack_sizes" placeholder="100 ml, 500 ml" /></div>
                    <div className="form-span-2"><label htmlFor="composition">Composition</label><textarea id="composition" name="composition" /></div>
                    <div className="form-span-2"><label htmlFor="indications">Indications / intended use</label><textarea id="indications" name="indications" /></div>
                    <div className="form-span-2"><label htmlFor="precautions">Precautions</label><textarea id="precautions" name="precautions" /></div>
                    <div><label htmlFor="contraindications">Contraindications</label><textarea id="contraindications" name="contraindications" /></div>
                    <div><label htmlFor="warnings">Warnings</label><textarea id="warnings" name="warnings" /></div>
                    <div><label htmlFor="meat_withdrawal">Meat withdrawal</label><input id="meat_withdrawal" name="meat_withdrawal" /></div>
                    <div><label htmlFor="milk_withdrawal">Milk withdrawal</label><input id="milk_withdrawal" name="milk_withdrawal" /></div>
                    <div><label htmlFor="egg_withdrawal">Egg withdrawal</label><input id="egg_withdrawal" name="egg_withdrawal" /></div>
                    <div className="form-span-2"><label htmlFor="description">Public description</label><textarea id="description" name="description" required /></div>
                    <div className="form-span-2"><label htmlFor="storage_instructions">Storage instructions</label><input id="storage_instructions" name="storage_instructions" /></div>
                    <div><label htmlFor="temperature_range">Temperature range</label><input id="temperature_range" name="temperature_range" /></div>
                    <div><label htmlFor="shelf_life">Shelf life</label><input id="shelf_life" name="shelf_life" /></div>
                    <div><label htmlFor="country_of_origin">Country of origin</label><input id="country_of_origin" name="country_of_origin" /></div>
                    <label className="checkbox-line"><input type="checkbox" name="cold_chain" /> Cold chain required</label>
                    <div><label htmlFor="regulatory_number">Regulatory reference</label><input id="regulatory_number" name="regulatory_number" /></div>
                    <div><label htmlFor="availability">Availability</label><input id="availability" name="availability" placeholder="In stock / contact company" /></div>
                    <div className="form-span-2"><label htmlFor="image_url">Public image URL</label><input id="image_url" name="image_url" type="url" placeholder="https://..." /></div>
                  </div>
                  <FormSubmitButton pendingLabel="Submitting product...">Submit for approval</FormSubmitButton>
                </fieldset>
              </form>

              <div className="backend-form-card product-management">
                <div className="section-heading">
                  <span className="section-kicker">MY PRODUCTS</span>
                  <h2>Approval status.</h2>
                </div>
                {productRows.length === 0 ? (
                  <div className="empty-state"><p>No products submitted yet.</p></div>
                ) : (
                  <div className="management-list">
                    {productRows.map((product) => (
                      <article key={product.id}>
                        <div>
                          <span className={`status-pill status-${product.verification_status}`}>{product.verification_status}</span>
                          <h3>{product.product_name}</h3>
                          <p>{product.category}</p>
                          {product.rejection_reason && <small>{product.rejection_reason}</small>}
                        </div>
                        <div className="management-links">
                          <Link href={`/dashboard/company/products/${product.id}`}>Edit</Link>
                          {product.verification_status === "approved" ? (
                            <Link href={`/marketplace/${product.slug}`}>View listing</Link>
                          ) : (
                            <form action={deletePendingProductAction}>
                              <input type="hidden" name="product_id" value={product.id} />
                              <button className="text-button" type="submit">Remove</button>
                            </form>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {canManageJobs && (
            <div className="company-workspace-grid">
              <form className="backend-form-card" action={createJobAction}>
                <div className="section-heading">
                  <span className="section-kicker">JOB POSTING</span>
                  <h2>Publish a structured opportunity.</h2>
                  <p>Every vacancy remains pending until administrator approval.</p>
                </div>
                <fieldset disabled={!approved}>
                  <div className="form-grid">
                    <div><label htmlFor="title">Job title</label><input id="title" name="title" required /></div>
                    <div><label htmlFor="employment_type">Employment type</label><select id="employment_type" name="employment_type" defaultValue="Full-time"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Consultancy</option></select></div>
                    <div><label htmlFor="job_sector">Sector</label><input id="job_sector" name="job_sector" placeholder="Poultry, livestock, pets..." /></div>
                    <div><label htmlFor="job_city">City</label><input id="job_city" name="job_city" /></div>
                    <div><label htmlFor="job_province">Province</label><input id="job_province" name="job_province" /></div>
                    <div><label htmlFor="minimum_qualification">Minimum qualification</label><input id="minimum_qualification" name="minimum_qualification" placeholder="DVM, MSc, diploma..." /></div>
                    <div><label htmlFor="minimum_experience">Minimum experience</label><input id="minimum_experience" name="minimum_experience" type="number" min="0" defaultValue="0" /></div>
                    <div><label htmlFor="deadline">Application deadline</label><input id="deadline" name="deadline" type="date" /></div>
                    <div className="form-span-2"><label htmlFor="job_description">Job description and requirements</label><textarea id="job_description" name="job_description" required /></div>
                  </div>
                  <FormSubmitButton pendingLabel="Submitting job...">Submit for approval</FormSubmitButton>
                </fieldset>
              </form>

              <div className="backend-form-card product-management">
                <div className="section-heading"><span className="section-kicker">MY JOBS</span><h2>Recruitment status.</h2></div>
                {jobRows.length === 0 ? (
                  <div className="empty-state"><p>No jobs submitted yet.</p></div>
                ) : (
                  <div className="management-list">
                    {jobRows.map((job) => (
                      <article key={job.id}>
                        <div>
                          <span className={`status-pill status-${job.verification_status}`}>{job.verification_status}</span>
                          <h3>{job.title}</h3>
                          <p>{job.sector || "Animal health"} · {job.city || "Pakistan"} · {job.employment_type}</p>
                        </div>
                        {job.verification_status === "approved" ? (
                          <Link href={`/jobs/${job.slug}`}>View listing</Link>
                        ) : (
                          <form action={deletePendingJobAction}>
                            <input type="hidden" name="job_id" value={job.id} />
                            <button className="text-button" type="submit">Remove</button>
                          </form>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {canManageProducts && (
            <div className="backend-form-card inquiry-panel">
              <div className="section-heading">
                <span className="section-kicker">CUSTOMER REQUESTS</span>
                <h2>Product inquiries and quotations.</h2>
              </div>
              {inquiryRows.length === 0 ? (
                <div className="empty-state"><p>No product inquiries yet.</p></div>
              ) : (
                <div className="inquiry-grid">
                  {inquiryRows.map((inquiry) => (
                    <article key={inquiry.id}>
                      <div className="review-header">
                        <div>
                          <span className="module-tag">{inquiry.inquiry_type}</span>
                          <h3>{productMap.get(inquiry.product_id)?.product_name || "Product inquiry"}</h3>
                        </div>
                        <span className="status-pill">{inquiry.status}</span>
                      </div>
                      <p><b>{inquiry.contact_name}</b> · {inquiry.contact_email}</p>
                      {inquiry.contact_phone && <p>{inquiry.contact_phone}</p>}
                      {inquiry.organization && <p>{inquiry.organization}</p>}
                      <p>{inquiry.message}</p>
                      <form className="inline-status-form" action={updateInquiryStatusAction}>
                        <input type="hidden" name="inquiry_id" value={inquiry.id} />
                        <select name="status" defaultValue={inquiry.status === "new" ? "reviewing" : inquiry.status}>
                          <option value="reviewing">Reviewing</option>
                          <option value="responded">Responded</option>
                          <option value="closed">Closed</option>
                        </select>
                        <button className="button button-secondary" type="submit">Update</button>
                      </form>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {canManageApplicants && (
            <div className="backend-form-card product-management">
              <div className="section-heading">
                <span className="section-kicker">APPLICANTS</span>
                <h2>Recent applications.</h2>
                <p>
                  Applicant visibility is enforced by the canonical
                  applicants.manage permission. Status-changing controls are not
                  exposed here because the current database policy only grants
                  employer-side read access.
                </p>
              </div>
              {applicationRows.length === 0 ? (
                <div className="empty-state"><p>No applications are available yet.</p></div>
              ) : (
                <div className="management-list">
                  {applicationRows.map((application) => (
                    <article key={application.id}>
                      <div>
                        <span className="status-pill">{application.status}</span>
                        <h3>{jobMap.get(application.job_id)?.title || "Job application"}</h3>
                        <p>Candidate reference: {application.candidate_user_id}</p>
                        <small>Applied {new Date(application.applied_at).toLocaleDateString("en-PK")}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {canManageMembers && (
            <div className="backend-form-card">
              <div className="section-heading">
                <span className="section-kicker">TEAM ACCESS</span>
                <h2>Company member management is enabled.</h2>
                <p>
                  The database already protects member invitations and permission
                  changes. A dedicated team-management screen can be added without
                  changing the company security model.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
