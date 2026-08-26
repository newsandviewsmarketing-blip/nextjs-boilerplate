import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { productCategories } from "@/lib/marketplace";
import {
  createProductAction,
  createJobAction,
  deletePendingJobAction,
  deletePendingProductAction,
  updateInquiryStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

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

export default async function CompanyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/company");
  if (!identity.roles.includes("company")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: company }, { data: products }, { data: inquiries }, { data: jobs }] =
    await Promise.all([
      supabase
        .from("company_profiles")
        .select("company_name, verification_status, rejection_reason")
        .eq("user_id", identity.userId)
        .maybeSingle(),
      supabase
        .from("products")
        .select(
          "id, slug, product_name, category, verification_status, rejection_reason, is_published, created_at",
        )
        .eq("company_user_id", identity.userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("product_inquiries")
        .select(
          "id, product_id, inquiry_type, contact_name, contact_email, contact_phone, organization, message, status, created_at",
        )
        .eq("company_user_id", identity.userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("id, slug, title, sector, city, employment_type, verification_status, is_published, created_at")
        .eq("company_user_id", identity.userId)
        .order("created_at", { ascending: false }),
    ]);
  const productRows = (products ?? []) as ProductRow[];
  const inquiryRows = (inquiries ?? []) as InquiryRow[];
  const jobRows = (jobs ?? []) as JobRow[];
  const productMap = new Map(productRows.map((product) => [product.id, product]));
  const approved = company?.verification_status === "approved";

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">COMPANY WORKSPACE</span>
            <h1>{company?.company_name || "Company dashboard"}</h1>
            <p>Manage product submissions and customer information requests.</p>
          </div>
          <Link className="button button-secondary" href="/dashboard">
            Account profile
          </Link>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...params} />
          {!approved && (
            <div className="setup-notice">
              <h2>Company approval is required.</h2>
              <p>
                Complete your company profile. Product submission becomes
                available after a VetConnect administrator approves it.
              </p>
              {company?.rejection_reason && (
                <p><b>Review note:</b> {company.rejection_reason}</p>
              )}
            </div>
          )}

          <div className="admin-summary company-summary">
            <article><b>{productRows.length}</b><span>Total products</span></article>
            <article>
              <b>{productRows.filter((item) => item.verification_status === "approved").length}</b>
              <span>Published products</span>
            </article>
            <article><b>{inquiryRows.length}</b><span>Information requests</span></article>
            <article><b>{jobRows.length}</b><span>Job posts</span></article>
          </div>

          <div className="company-workspace-grid">
            <form className="backend-form-card" action={createProductAction}>
              <div className="section-heading">
                <span className="section-kicker">PRODUCT SUBMISSION</span>
                <h2>Add a structured product.</h2>
                <p>Every submission stays pending until administrator approval.</p>
              </div>
              <fieldset disabled={!approved}>
                <div className="form-grid">
                  <div>
                    <label htmlFor="product_name">Product name</label>
                    <input id="product_name" name="product_name" required />
                  </div>
                  <div>
                    <label htmlFor="category">Category</label>
                    <select id="category" name="category" required defaultValue="">
                      <option value="" disabled>Select category</option>
                      {productCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </div>
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
                <FormSubmitButton pendingLabel="Submitting product...">
                  Submit for approval
                </FormSubmitButton>
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
                        <span className={`status-pill status-${product.verification_status}`}>
                          {product.verification_status}
                        </span>
                        <h3>{product.product_name}</h3>
                        <p>{product.category}</p>
                        {product.rejection_reason && <small>{product.rejection_reason}</small>}
                      </div>
                      {product.verification_status === "approved" ? (
                        <div className="management-links">
                          <Link href={`/dashboard/company/products/${product.id}`}>Edit</Link>
                          <Link href={`/marketplace/${product.slug}`}>View listing</Link>
                        </div>
                      ) : (
                        <div className="management-links">
                          <Link href={`/dashboard/company/products/${product.id}`}>Edit</Link>
                          <form action={deletePendingProductAction}>
                            <input type="hidden" name="product_id" value={product.id} />
                            <button className="text-button" type="submit">Remove</button>
                          </form>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="company-workspace-grid">
            <form className="backend-form-card" action={createJobAction}>
              <div className="section-heading"><span className="section-kicker">JOB POSTING</span><h2>Publish a structured opportunity.</h2><p>Every vacancy remains pending until administrator approval.</p></div>
              <fieldset disabled={!approved}><div className="form-grid">
                <div><label htmlFor="title">Job title</label><input id="title" name="title" required /></div>
                <div><label htmlFor="employment_type">Employment type</label><select id="employment_type" name="employment_type" defaultValue="Full-time"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Consultancy</option></select></div>
                <div><label htmlFor="job_sector">Sector</label><input id="job_sector" name="job_sector" placeholder="Poultry, livestock, pets..." /></div>
                <div><label htmlFor="job_city">City</label><input id="job_city" name="job_city" /></div>
                <div><label htmlFor="job_province">Province</label><input id="job_province" name="job_province" /></div>
                <div><label htmlFor="minimum_qualification">Minimum qualification</label><input id="minimum_qualification" name="minimum_qualification" placeholder="DVM, MSc, diploma..." /></div>
                <div><label htmlFor="minimum_experience">Minimum experience</label><input id="minimum_experience" name="minimum_experience" type="number" min="0" defaultValue="0" /></div>
                <div><label htmlFor="deadline">Application deadline</label><input id="deadline" name="deadline" type="date" /></div>
                <div className="form-span-2"><label htmlFor="job_description">Job description and requirements</label><textarea id="job_description" name="job_description" required /></div>
              </div><FormSubmitButton pendingLabel="Submitting job...">Submit for approval</FormSubmitButton></fieldset>
            </form>
            <div className="backend-form-card product-management"><div className="section-heading"><span className="section-kicker">MY JOBS</span><h2>Recruitment status.</h2></div>
              {jobRows.length === 0 ? <div className="empty-state"><p>No jobs submitted yet.</p></div> : <div className="management-list">{jobRows.map((job) => <article key={job.id}><div><span className={`status-pill status-${job.verification_status}`}>{job.verification_status}</span><h3>{job.title}</h3><p>{job.sector || "Animal health"} • {job.city || "Pakistan"} • {job.employment_type}</p></div>{job.verification_status === "approved" ? <Link href={`/jobs/${job.slug}`}>View listing</Link> : <form action={deletePendingJobAction}><input type="hidden" name="job_id" value={job.id} /><button className="text-button" type="submit">Remove</button></form>}</article>)}</div>}
            </div>
          </div>

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
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
