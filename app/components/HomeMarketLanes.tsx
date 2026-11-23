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
      {[0,1].map(copy=><div className="vc-market-track-group" aria-hidden={copy===1} key={copy}>
       {companies.map(company=><Link tabIndex={copy===1?-1:undefined} key={company.id} className="vc-market-company" href={"/companies/"+company.id}>
        {company.logo?
         // eslint-disable-next-line @next/next/no-img-element
         <img src={company.logo} alt={company.name+" logo"} loading="lazy" decoding="async"/>:
         <span className="vc-market-initial" aria-hidden="true">{company.name.slice(0,2).toUpperCase()}</span>}
        <span><strong>{company.name}</strong><small>{company.city||"Pakistan"}</small></span>
       </Link>)}
      </div>)}
     </div>
    </div>:<div className="vc-market-empty">Browse published businesses. <Link href="/companies">Explore companies</Link></div>}
    <div className="vc-market-lane-heading"><h3>Product categories</h3><span>Browse available approved listings by category</span></div>
    <div className="vc-product-categories">
     {[{name:"Vaccines",kind:"vaccines",categories:"Vaccines"},{name:"Medicines",kind:"medicines",categories:"Medicines"},{name:"Feed & Nutrition",kind:"feed",categories:"Poultry Feed,Dairy Feed,Pet Food,Fish Feed,Feed Additives"},{name:"Supplements",kind:"supplements",categories:"Nutritional Supplements"},{name:"Equipment",kind:"equipment",categories:"Farm Equipment,Diagnostics"}].map(item=>
      ["Feed & Nutrition","Equipment"].includes(item.name)?<Link key={item.name} href={"/marketplace?category="+encodeURIComponent(item.categories)+"#products"} className="vc-product-category">
       <span className={"vc-category-photo vc-category-photo-"+item.kind} aria-hidden="true"/><strong>{item.name}</strong>
      </Link>:<div key={item.name} className="vc-product-category" aria-label={item.name+" category information"}><span className={"vc-category-photo vc-category-photo-"+item.kind} aria-hidden="true"/><strong>{item.name}</strong></div>)}
    </div>
    <div className="vc-market-lane-heading"><h3>Published products</h3><span>Approved marketplace listings</span></div>
    {products.length>0?<div className="vc-market-window" aria-label="Animal-health products, scroll horizontally">
     <div className={"vc-market-track vc-market-track-right"+(products.length<4?" vc-market-static":"")}>
      {[0,1].map(copy=><div className="vc-market-track-group" aria-hidden={copy===1} key={copy}>
       {products.map(product=><Link tabIndex={copy===1?-1:undefined} key={product.slug} className="vc-market-company" href={"/marketplace/"+product.slug}>
        {product.image?
         // eslint-disable-next-line @next/next/no-img-element
         <img src={product.image} alt={product.name+" product image"} loading="lazy" decoding="async"/>:
         <span className="vc-market-initial" aria-hidden="true">P</span>}
        <span><strong>{product.name}</strong><small>{product.company}{product.category?" · "+product.category:""}</small></span>
       </Link>)}
      </div>)}
     </div>
    </div>:<div className="vc-market-empty">Approved products will appear here when available. <Link href="/marketplace">Browse marketplace</Link></div>}
   </div>
   <div className="vc-home-business-link">Represent a company? <Link href="/register?role=company#registration">Create your business profile</Link></div>
  </div>
 </section>;
}
