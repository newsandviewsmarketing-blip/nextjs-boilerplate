import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const categories = ["Medicines", "Vaccines", "Nutritional Supplements", "Poultry Feed", "Dairy Feed", "Pet Food", "Fish Feed", "Disinfectants", "Diagnostics", "Farm Equipment", "Water Treatment", "Feed Additives"];
const products = [
  ["MED", "Veterinary Medicine", "Animal Health Company", "Medicine", "Pack size • Generic • Brand"],
  ["VAX", "Veterinary Vaccine", "Biologicals Company", "Vaccine", "Species • Pack • Storage"],
  ["NUT", "Nutritional Supplement", "Nutrition Company", "Nutrition", "Composition • Pack • Price"],
  ["FEED", "Poultry Feed Product", "Feed Company", "Poultry", "Type • Bag size • Bulk quote"],
  ["PET", "Premium Pet Food", "Pet Care Company", "Pets", "Dog/Cat • Pack • Delivery"],
  ["AQUA", "Aquaculture Feed", "Aqua Company", "Fishery", "Species • Pellet • Pack"],
];

export default function MarketplacePage() {
  return <main><SiteHeader /><section className="page-hero marketplace-hero"><div className="shell"><span className="section-kicker">B2B + B2C MARKETPLACE</span><h1>Animal-health products, organized by sector and supplier.</h1><p>Structured company profiles and product data make it easier to search, compare, request quotations and build a reliable veterinary-sector product database.</p><div className="hero-actions"><button className="button button-primary">Browse products</button><button className="button button-secondary">List your company</button></div></div></section>
    <section className="section compact-section"><div className="shell"><div className="section-heading"><span className="section-kicker">EXPLORE CATEGORIES</span><h2>Search by product need.</h2></div><div className="category-grid">{categories.map((c,i)=><div key={c}><span>{String(i+1).padStart(2,"0")}</span><b>{c}</b></div>)}</div></div></section>
    <section className="section section-soft"><div className="shell"><div className="directory-top"><div><b>Product listings</b><span>Sample marketplace data</span></div><div className="market-search"><input placeholder="Search products, generic or company"/><select><option>All sectors</option><option>Poultry</option><option>Dairy</option><option>Pets</option><option>Fishery</option></select></div></div><div className="product-grid">{products.map(p=><article className="product-card" key={p[1]}><div className="product-visual">{p[0]}</div><span>{p[3]}</span><h3>{p[1]}</h3><p>{p[2]}</p><small>{p[4]}</small><div className="product-meta"><b>Price / offer</b><b>Availability</b></div><div className="card-actions"><button className="button button-primary">View product</button><button className="button button-secondary">Bulk quote</button></div></article>)}</div></div></section>
    <section className="section"><div className="shell two-col"><div><span className="section-kicker">COMPANY PANEL</span><h2>Business profile + controlled product publishing.</h2><p>Companies can maintain business identity, address, city, contacts, website/social links and business type, while product submissions can be organized by sector and subcategory before admin approval.</p></div><div className="spec-list"><div><b>Company profile</b><span>Name, address, city, province, phone, website, contact person and business type.</span></div><div><b>Product information</b><span>Product name/code, generic, packing, type, price, offer, delivery, description and availability.</span></div><div><b>Supporting data</b><span>Documents, special instructions, images, customer feedback and rating.</span></div><div><b>Admin workflow</b><span>Category controls and product approval before public listing.</span></div></div></div></section><SiteFooter /></main>;
}
