import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  productCategories,
  productMark,
  sampleProducts,
  type PublicProduct,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

async function loadProducts() {
  if (!isSupabaseConfigured()) return sampleProducts;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("verification_status", "approved")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (!data?.length) return sampleProducts;
  const companyIds = [...new Set(data.map((row) => row.company_user_id))];
  const { data: companies } = await supabase
    .from("company_profiles")
    .select("user_id, company_name, city")
    .in("user_id", companyIds);
  const companyMap = new Map(
    (companies ?? []).map((company) => [company.user_id, company]),
  );
  return data.map((row): PublicProduct => {
    const company = companyMap.get(row.company_user_id);
    return {
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
  });
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; category?: string }>;
}) {
  const params = await searchParams;
  const products = await loadProducts();
  const query = (params.q ?? "").toLowerCase();
  const visibleProducts = products.filter(
    (product) =>
      (!query ||
        `${product.product_name} ${product.company_name} ${product.category} ${product.generic_name ?? ""}`
          .toLowerCase()
          .includes(query)) &&
      (!params.sector ||
        params.sector === "All sectors" ||
        product.sector === params.sector) &&
      (!params.category || product.category === params.category),
  );
  const sectors = [...new Set(products.map((product) => product.sector).filter(Boolean))] as string[];

  return (
    <main>
      <SiteHeader />
      <section className="page-hero marketplace-hero">
        <div className="shell">
          <span className="section-kicker">B2B + B2C MARKETPLACE</span>
          <h1>Animal-health products, organized by sector and supplier.</h1>
          <p>
            Browse administrator-approved company products and send information
            or quotation requests directly to the supplier.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="#products">Browse products</Link>
            <Link className="button button-secondary" href="/register?role=company#registration">List your company</Link>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">EXPLORE CATEGORIES</span>
            <h2>Search by product need.</h2>
          </div>
          <div className="category-grid">
            {productCategories.map((category, index) => (
              <Link key={category} href={`/marketplace?category=${encodeURIComponent(category)}#products`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{category}</b>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section id="products" className="section section-soft">
        <div className="shell">
          <div className="directory-top">
            <div>
              <b>{visibleProducts.length} product listings</b>
              <span>{products.some((product) => product.is_sample) ? "Sample preview until companies publish approved products" : "Verified company marketplace data"}</span>
            </div>
            <form className="market-search" method="get">
              <input name="q" defaultValue={params.q ?? ""} placeholder="Search product or company" />
              <select name="sector" defaultValue={params.sector ?? "All sectors"}>
                <option>All sectors</option>
                {sectors.map((sector) => <option key={sector}>{sector}</option>)}
              </select>
              {params.category && <input type="hidden" name="category" value={params.category} />}
              <button className="button button-primary" type="submit">Search</button>
            </form>
          </div>
          {params.category && (
            <div className="active-filter">
              Category: <b>{params.category}</b> <Link href="/marketplace#products">Clear</Link>
            </div>
          )}
          {visibleProducts.length === 0 ? (
            <div className="empty-state"><h2>No products match this search.</h2><Link href="/marketplace#products">Clear search</Link></div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.slug}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="product-visual product-image" src={product.image_url} alt="" />
                  ) : (
                    <div className="product-visual">{productMark(product)}</div>
                  )}
                  <span>{product.category}</span>
                  <h3>{product.product_name}</h3>
                  <p>{product.company_name}</p>
                  <small>{[product.generic_name, product.dosage_form, ...product.pack_sizes].filter(Boolean).join(" • ") || "Structured company listing"}</small>
                  <div className="product-meta"><b>{product.sector || "Animal health"}</b><b>{product.availability || "Contact company"}</b></div>
                  <div className="card-actions">
                    <Link className="button button-primary" href={`/marketplace/${product.slug}`}>View details</Link>
                    <Link className="button button-secondary" href={`/marketplace/${product.slug}#request`}>Request quotation</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section">
        <div className="shell two-col">
          <div><span className="section-kicker">COMPANY PANEL</span><h2>Controlled product publishing.</h2><p>Verified companies submit structured product information for administrative approval. This module is informational and does not process payments.</p></div>
          <div className="spec-list">
            <div><b>Company profile</b><span>Verified business identity and public contact details.</span></div>
            <div><b>Product information</b><span>Product, generic, composition, packing and availability.</span></div>
            <div><b>Customer requests</b><span>Information, company contact and quotation inquiries.</span></div>
            <div><b>Admin workflow</b><span>Approval is required before a listing becomes public.</span></div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
