import Link from "next/link";

export type HomeCompany = {id:string;name:string;city:string|null;logo:string|null};
export type HomeProduct = {slug:string;name:string;company:string;image:string|null;category:string|null};

export default function HomeMarketLanes({companies,products}:{companies:HomeCompany[];products:HomeProduct[]}){
 return <section className="vc-home-market" aria-labelledby="vc-market-heading">
  <div className="shell">
   <div className="vc-home-heading">
    <div><span className="section-kicker">COMPANIES & MARKETPLACE</span>
     <h2 id="vc-market-heading">Find suppliers and animal-health products</h2>
     <p>Browse published company profiles and approved product information.</p>
    </div>
    <div className="vc-home-heading-links"><Link href="/companies">All companies →</Link><Link href="/marketplace">Marketplace →</Link></div>
   </div>
   <div className="vc-market-lane-group">
    <div className="vc-market-lane-heading"><h3>Companies</h3><span>Published business profiles</span></div>
    {companies.length>0?<div className="vc-market-window" aria-label="Company directory, scroll horizontally">
     <div className={"vc-market-track vc-market-track-left"+(companies.length<4?" vc-market-static":"")}>
      {companies.map(company=><Link key={company.id} className="vc-market-company" href={"/companies/"+company.id}>
       {company.logo?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logo} alt={company.name+" logo"} loading="lazy" decoding="async"/>:
        <span className="vc-market-initial" aria-hidden="true">{company.name.slice(0,2).toUpperCase()}</span>}
       <span><strong>{company.name}</strong><small>{company.city||"Pakistan"}</small></span>
      </Link>)}
     </div>
    </div>:<div className="vc-market-empty">Browse the company directory for newly published businesses. <Link href="/companies">Explore companies</Link></div>}
    <div className="vc-market-lane-heading"><h3>Products</h3><span>Approved marketplace listings</span></div>
    {products.length>0?<div className="vc-market-window" aria-label="Animal-health products, scroll horizontally">
     <div className={"vc-market-track vc-market-track-right"+(products.length<4?" vc-market-static":"")}>
      {products.map(product=><Link key={product.slug} className="vc-market-company" href={"/marketplace/"+product.slug}>
       {product.image?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={product.name+" product image"} loading="lazy" decoding="async"/>:
        <span className="vc-market-initial" aria-hidden="true">P</span>}
       <span><strong>{product.name}</strong><small>{product.company}{product.category?" · "+product.category:""}</small></span>
      </Link>)}
     </div>
    </div>:<div className="vc-market-empty">Approved products will appear here when available. <Link href="/marketplace">Browse marketplace</Link></div>}
   </div>
   <div className="vc-home-business-link">Represent a company? <Link href="/register?role=company#registration">Create your business profile</Link></div>
  </div>
 </section>;
}
