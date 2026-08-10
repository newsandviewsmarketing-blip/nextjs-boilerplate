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
  const [{ data: company }, { data: products }, { data: inquiries }] =
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
    ]);
  const productRows = (products ?? []) as ProductRow[];
  const inquiryRows = (inquiries ?? []) as InquiryRow[];
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
                  <div><label htmlFor="sector">Sector / animal</label><input id="sector" name="sector" placeholder="Poultry, dairy, pets..." /></div>
                  <div><label htmlFor="dosage_form">Dosage / product form</label><input id="dosage_form" name="dosage_form" /></div>
                  <div><label htmlFor="strength">Strength</label><input id="strength" name="strength" /></div>
                  <div><label htmlFor="pack_sizes">Pack sizes</label><input id="pack_sizes" name="pack_sizes" placeholder="100 ml, 500 ml" /></div>
                  <div className="form-span-2"><label htmlFor="composition">Composition</label><textarea id="composition" name="composition" /></div>
                  <div className="form-span-2"><label htmlFor="indications">Indications / intended use</label><textarea id="indications" name="indications" /></div>
                  <div className="form-span-2"><label htmlFor="description">Public description</label><textarea id="description" name="description" required /></div>
                  <div className="form-span-2"><label htmlFor="storage_instructions">Storage instructions</label><input id="storage_instructions" name="storage_instructions" /></div>
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
                        <Link href={`/marketplace/${product.slug}`}>View listing</Link>
                      ) : (
                        <form action={deletePendingProductAction}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <button className="text-button" type="submit">Remove</button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
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
