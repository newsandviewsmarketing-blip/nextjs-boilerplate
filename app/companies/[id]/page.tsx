import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  companyInitials,
  productMark,
  sampleCompanies,
  sampleProducts,
  type PublicCompany,
  type PublicProduct,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

async function loadCompany(id: string) {
  const sampleIndex = id.startsWith("sample-") ? Number(id.replace("sample-", "")) - 1 : -1;
  if (sampleIndex >= 0) {
    return { company: sampleCompanies[sampleIndex] ?? null, products: sampleProducts.slice(0, 3) };
  }
  if (!isSupabaseConfigured()) return { company: null, products: [] };
  const supabase = await createClient();
  const [{ data: company }, { data: products }] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("user_id, company_name, business_type, city, address, description, website, contact_email, logo_url")
      .eq("user_id", id)
      .eq("verification_status", "approved")
      .maybeSingle(),
    supabase
      .from("products")
      .select("*")
      .eq("company_user_id", id)
      .eq("verification_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ]);
  const publicProducts = (products ?? []).map((row): PublicProduct => ({
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
    company_user_id: id,
    company_name: company?.company_name ?? "Verified company",
    company_city: company?.city ?? null,
  }));
  return { company: company as PublicCompany | null, products: publicProducts };
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company, products } = await loadCompany(id);
  if (!company) notFound();
  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="shell company-profile-hero">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="company-profile-logo" src={company.logo_url} alt="" />
          ) : (
            <div className="company-mark company-profile-logo">{companyInitials(company.company_name)}</div>
          )}
          <div>
            <span className="section-kicker">{company.is_sample ? "SAMPLE COMPANY" : "VERIFIED COMPANY"}</span>
            <h1>{company.company_name}</h1>
            <p>{company.description || "A verified VetConnect animal-health company profile."}</p>
            <div className="profile-chips"><span>{company.business_type || "Animal health"}</span><span>{company.city || "Pakistan"}</span></div>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell company-contact-grid">
          <article><span>Location</span><b>{company.address || company.city || "Pakistan"}</b></article>
          <article><span>Email</span>{company.contact_email ? <a href={`mailto:${company.contact_email}`}>{company.contact_email}</a> : <b>Contact through a product request</b>}</article>
          <article><span>Website</span>{company.website ? <a href={company.website} target="_blank" rel="noreferrer">Visit company website</a> : <b>Not provided</b>}</article>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell">
          <div className="section-heading"><span className="section-kicker">APPROVED PRODUCTS</span><h2>Public company listings.</h2></div>
          {products.length === 0 ? (
            <div className="empty-state"><p>This company has no approved public products yet.</p><Link href="/marketplace">Browse marketplace</Link></div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.slug}>
                  <div className="product-visual">{productMark(product)}</div>
                  <span>{product.category}</span><h3>{product.product_name}</h3><p>{product.generic_name || product.brand_name || "Structured product listing"}</p>
                  <Link className="button button-primary button-full" href={`/marketplace/${product.slug}`}>View product</Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
