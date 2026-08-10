import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import { getCurrentIdentity } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { productMark, sampleProducts, type PublicProduct } from "@/lib/marketplace";
import { createProductInquiryAction, toggleSavedProductAction } from "../actions";

export const dynamic = "force-dynamic";

async function loadProduct(slug: string) {
  const sample = sampleProducts.find((product) => product.slug === slug);
  if (!isSupabaseConfigured()) return { product: sample ?? null, saved: false };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("verification_status", "approved")
    .eq("is_published", true)
    .maybeSingle();
  if (!row) return { product: sample ?? null, saved: false };
  const { data: company } = await supabase
    .from("company_profiles")
    .select("company_name, city")
    .eq("user_id", row.company_user_id)
    .maybeSingle();
  const identity = await getCurrentIdentity();
  const { data: saved } = identity
    ? await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", identity.userId)
        .eq("product_id", row.id)
        .maybeSingle()
    : { data: null };
  const product: PublicProduct = {
    id: row.id,
    slug: row.slug,
    product_name: row.product_name,
    brand_name: row.brand_name,
    generic_name: row.generic_name,
    category: row.category,
    sector: row.sector,
    composition: row.composition,
    strength: row.strength,
    dosage_form: row.dosage_form,
    pack_sizes: row.pack_sizes ?? [],
    indications: row.indications,
    description: row.description,
    storage_instructions: row.storage_instructions,
    image_url: row.image_url,
    availability: row.availability,
    company_user_id: row.company_user_id,
    company_name: company?.company_name ?? "Verified VetConnect company",
    company_city: company?.city ?? null,
  };
  return { product, saved: Boolean(saved), identity };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { slug } = await params;
  const messages = await searchParams;
  const { product, saved, identity } = await loadProduct(slug);
  if (!product) notFound();

  return (
    <main>
      <SiteHeader />
      <section className="page-hero product-detail-hero">
        <div className="shell product-detail-grid">
          <div className="product-detail-visual">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.product_name} />
            ) : productMark(product)}
          </div>
          <div>
            <span className="section-kicker">{product.category}</span>
            <h1>{product.product_name}</h1>
            <p>{product.description || "Structured product information from a verified VetConnect company."}</p>
            <div className="profile-chips">
              {product.brand_name && <span>{product.brand_name}</span>}
              {product.generic_name && <span>{product.generic_name}</span>}
              {product.sector && <span>{product.sector}</span>}
            </div>
            <div className="hero-actions">
              <a className="button button-primary" href="#request">Request information</a>
              {product.company_user_id ? (
                <Link className="button button-secondary" href={`/companies/${product.company_user_id}`}>View company</Link>
              ) : (
                <Link className="button button-secondary" href="/companies">View companies</Link>
              )}
              {product.id && (
                <form action={toggleSavedProductAction}>
                  <input type="hidden" name="slug" value={product.slug} />
                  <input type="hidden" name="product_id" value={product.id} />
                  <button className="button button-dark" type="submit">{saved ? "Remove saved" : "Save product"}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell product-information-grid">
          <article><span>Company</span><b>{product.company_name}</b><small>{product.company_city || "Pakistan"}</small></article>
          <article><span>Form / strength</span><b>{[product.dosage_form, product.strength].filter(Boolean).join(" · ") || "See company information"}</b></article>
          <article><span>Pack sizes</span><b>{product.pack_sizes.join(", ") || "Contact company"}</b></article>
          <article><span>Availability</span><b>{product.availability || "Contact company"}</b></article>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell two-col product-copy-grid">
          <div className="backend-form-card">
            <h2>Product information</h2>
            <dl className="product-specs">
              <div><dt>Composition</dt><dd>{product.composition || "Provided by the company on request."}</dd></div>
              <div><dt>Indications</dt><dd>{product.indications || "Refer to the approved manufacturer information."}</dd></div>
              <div><dt>Storage</dt><dd>{product.storage_instructions || "Follow the manufacturer label."}</dd></div>
            </dl>
            <p className="product-disclaimer">Product listings are informational. VetConnect does not sell medicines, process payments or replace professional veterinary advice.</p>
          </div>
          <div id="request" className="backend-form-card">
            <FormMessage {...messages} />
            <span className="section-kicker">CONTACT COMPANY</span>
            <h2>Send a product request.</h2>
            {product.is_sample || !product.id ? (
              <div className="setup-notice"><p>This is preview data. Requests activate when an approved company publishes this product.</p></div>
            ) : (
              <form action={createProductInquiryAction}>
                <input type="hidden" name="slug" value={product.slug} />
                <input type="hidden" name="product_id" value={product.id} />
                <label htmlFor="inquiry_type">Request type</label>
                <select id="inquiry_type" name="inquiry_type" defaultValue="information">
                  <option value="information">Request information</option>
                  <option value="quotation">Request quotation</option>
                  <option value="contact">Contact company</option>
                </select>
                <label htmlFor="contact_name">Your name</label>
                <input id="contact_name" name="contact_name" defaultValue={identity?.profile?.full_name ?? ""} required />
                <label htmlFor="contact_email">Email</label>
                <input id="contact_email" name="contact_email" type="email" defaultValue={identity?.email ?? ""} required />
                <label htmlFor="contact_phone">Phone</label>
                <input id="contact_phone" name="contact_phone" defaultValue={identity?.profile?.phone ?? ""} />
                <label htmlFor="organization">Organization</label>
                <input id="organization" name="organization" />
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" placeholder="Tell the company what information or quantity you need." required />
                <FormSubmitButton pendingLabel="Sending request...">Send request</FormSubmitButton>
                {!identity && <p className="form-help">You will be asked to sign in before the request is sent.</p>}
              </form>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
