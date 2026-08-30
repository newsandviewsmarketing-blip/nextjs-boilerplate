import type { Metadata } from "next";
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

function regulatoryLabel(status?: string) {
  if (status === "verified") return "DRAP registration verified";
  if (status === "pending") return "Regulatory review pending";
  if (status === "not_applicable") return "Regulatory status reviewed: not applicable";
  if (status === "returned") return "Regulatory data returned for correction";
  return "Regulatory information not provided";
}

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
  const { data: company } = row.company_id
    ? await supabase.from("public_company_directory").select("id, user_id, company_name, city").eq("id", row.company_id).maybeSingle()
    : await supabase.from("public_companies").select("user_id, company_name, city").eq("user_id", row.company_user_id).maybeSingle();
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
    product_code: row.product_code,
    subclass: row.subclass,
    therapeutic_class: row.therapeutic_class,
    sectors: row.sectors ?? [],
    species: row.species ?? [],
    production_systems: row.production_systems ?? [],
    use_areas: row.use_areas ?? [],
    routes: row.routes ?? [],
    precautions: row.precautions,
    contraindications: row.contraindications,
    warnings: row.warnings,
    meat_withdrawal: row.meat_withdrawal,
    milk_withdrawal: row.milk_withdrawal,
    egg_withdrawal: row.egg_withdrawal,
    cold_chain: row.cold_chain,
    temperature_range: row.temperature_range,
    shelf_life: row.shelf_life,
    country_of_origin: row.country_of_origin,
    regulatory_review_status: row.regulatory_review_status,
    company_user_id: row.company_user_id,
    company_id: row.company_id,
    company_name: company?.company_name ?? "Verified VetConnect company",
    company_city: company?.city ?? null,
  };
  return { product, saved: Boolean(saved), identity };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await loadProduct(slug);
  if (!product) return { title: "Veterinary Product" };
  return {
    title: `${product.product_name} by ${product.company_name} | Veterinary Product Directory`,
    description: product.description || `${product.product_name} product information from ${product.company_name} on VetConnect Pakistan.`,
    alternates: { canonical: `/marketplace/${slug}` },
    robots: product.is_sample ? { index: false, follow: true } : undefined,
    openGraph: product.image_url ? { images: [{ url: product.image_url, alt: product.product_name }] } : undefined,
  };
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
              <img src={product.image_url} alt={`${product.product_name} product image`} loading="lazy" decoding="async" />
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
              <span>{regulatoryLabel(product.regulatory_review_status)}</span>
            </div>
            <div className="hero-actions">
              <a className="button button-primary" href="#request">Request information</a>
              {product.company_id || product.company_user_id ? (
                <Link className="button button-secondary" href={`/companies/${product.company_id ?? product.company_user_id}`}>View company</Link>
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
          <article><span>Country of origin</span><b>{product.country_of_origin || "Not provided"}</b></article>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell two-col product-copy-grid">
          <div className="backend-form-card">
            <h2>Product information</h2>
            <dl className="product-specs">
              <div><dt>Product class</dt><dd>{[product.category, product.subclass, product.therapeutic_class].filter(Boolean).join(" · ") || "Not provided"}</dd></div>
              <div><dt>Sectors</dt><dd>{product.sectors?.join(", ") || product.sector || "Not provided"}</dd></div>
              <div><dt>Species</dt><dd>{product.species?.join(", ") || "Not provided"}</dd></div>
              <div><dt>Production systems</dt><dd>{product.production_systems?.join(", ") || "Not provided"}</dd></div>
              <div><dt>Use areas</dt><dd>{product.use_areas?.join(", ") || "Not provided"}</dd></div>
              <div><dt>Routes</dt><dd>{product.routes?.join(", ") || "Not provided"}</dd></div>
              <div><dt>Composition</dt><dd>{product.composition || "Provided by the company on request."}</dd></div>
              <div><dt>Indications</dt><dd>{product.indications || "Refer to the approved manufacturer information."}</dd></div>
              <div><dt>Precautions</dt><dd>{product.precautions || "Refer to the manufacturer label."}</dd></div>
              <div><dt>Contraindications</dt><dd>{product.contraindications || "Refer to the manufacturer label."}</dd></div>
              <div><dt>Warnings</dt><dd>{product.warnings || "Refer to the manufacturer label."}</dd></div>
              <div><dt>Withdrawal periods</dt><dd>{[
                product.meat_withdrawal && `Meat: ${product.meat_withdrawal}`,
                product.milk_withdrawal && `Milk: ${product.milk_withdrawal}`,
                product.egg_withdrawal && `Eggs: ${product.egg_withdrawal}`,
              ].filter(Boolean).join(" · ") || "Not provided"}</dd></div>
              <div><dt>Storage</dt><dd>{product.storage_instructions || "Follow the manufacturer label."}</dd></div>
              <div><dt>Cold chain</dt><dd>{product.cold_chain ? `Required${product.temperature_range ? ` · ${product.temperature_range}` : ""}` : "Not indicated"}</dd></div>
              <div><dt>Shelf life</dt><dd>{product.shelf_life || "Not provided"}</dd></div>
              <div><dt>Regulatory review</dt><dd>{regulatoryLabel(product.regulatory_review_status)}</dd></div>
            </dl>
            <p className="product-disclaimer">Product listings are informational. A VetConnect Verified Product Profile is not the same as regulatory registration. VetConnect does not sell medicines, process payments or replace professional veterinary advice.</p>
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
