import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import SectorJobSlider,{type CurrentJobSlide} from "./components/SectorJobSlider";
import HomeMarketLanes,{type HomeCompany,type HomeProduct} from "./components/HomeMarketLanes";
import "./home-focused.css";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createClient} from "@/lib/supabase/server";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.vetconnect.com.pk/" },
};

export const dynamic="force-dynamic";
async function loadVerifiedCurrentJobs():Promise<CurrentJobSlide[]>{
 if(!isSupabaseConfigured())return [];
 const supabase=await createClient();
 const [{data:listed,error},{data:sectors}]=await Promise.all([
  supabase.from("public_jobs").select("id,slug,title,sector,city,province,employment_type,company_name,deadline").limit(100),
  supabase.from("master_data_items").select("label").eq("category","job_sector").eq("is_active",true)
 ]);
 if(error||!listed?.length)return [];
 const approvedSectors=new Set((sectors??[]).map(s=>s.label.toLowerCase()));
 const today=new Date().toISOString().slice(0,10);
 const filtered=listed.filter(job=>!job.deadline||job.deadline>=today);
 if(!filtered.length)return [];
 const {data:dates}=await supabase.from("jobs").select("id,created_at").in("id",filtered.map(j=>j.id));
 const timestamps=new Map((dates??[]).map(x=>[x.id,x.created_at]));
 const current=filtered.sort((a,b)=>String(timestamps.get(b.id)||"").localeCompare(String(timestamps.get(a.id)||""))).slice(0,10);
 // Read image metadata only for published jobs already returned by public_jobs.
 // The route itself enforces approval and publication before serving any image.
 const {data:media,error:mediaError}=await supabase.from("jobs")
  .select("id,advert_image_path,advert_image_mime,is_published,verification_status")
  .in("id",current.map(job=>job.id));
 const imageById=new Map((mediaError?[]:(media??[])).map(row=>[row.id,
  Boolean(row.advert_image_path && row.is_published && row.verification_status==="approved" &&
   ["image/jpeg","image/png","image/webp"].includes(row.advert_image_mime??""))]));
 return current.map(job=>({
   id:job.id,slug:job.slug,title:job.title,
   sector:job.sector && approvedSectors.has(job.sector.trim().toLowerCase()) ? job.sector.trim() : "Sector pending classification",
   company_name:job.company_name,location:job.city||job.province||"Pakistan",
   employment_type:job.employment_type,image_available:imageById.get(job.id)??false
  }));
}
async function loadHomepageMarket():Promise<{companies:HomeCompany[];products:HomeProduct[]}>{
 if(!isSupabaseConfigured())return {companies:[],products:[]};
 const supabase=await createClient();
 const [companyResult,productResult]=await Promise.all([
  supabase.from("public_company_directory").select("id,user_id,company_name,city,logo_url").order("company_name").limit(16),
  supabase.from("products").select("slug,product_name,category,image_url,company_id,company_user_id").eq("verification_status","approved").eq("is_published",true).order("created_at",{ascending:false}).limit(16)
 ]);
 const companyRows=companyResult.error?[]:companyResult.data??[];
 const companies:HomeCompany[]=companyRows.map(row=>({
  id:String(row.id),name:String(row.company_name),city:row.city??null,logo:row.logo_url??null
 }));
 const productRows=productResult.error?[]:productResult.data??[];
 const companyIds=[...new Set(productRows.map(row=>row.company_id).filter((id):id is string=>typeof id==="string"))];
 const legacyIds=[...new Set(productRows.map(row=>row.company_user_id).filter((id):id is string=>typeof id==="string"))];
 const [canonical,legacy]=await Promise.all([
  companyIds.length?supabase.from("public_company_directory").select("id,company_name").in("id",companyIds):Promise.resolve({data:[]}),
  legacyIds.length?supabase.from("public_companies").select("user_id,company_name").in("user_id",legacyIds):Promise.resolve({data:[]})
 ]);
 const companyById=new Map((canonical.data??[]).map(row=>[row.id,row.company_name]));
 const companyByUser=new Map((legacy.data??[]).map(row=>[row.user_id,row.company_name]));
 const products:HomeProduct[]=productRows.filter(row=>row.slug&&row.product_name).map(row=>({
  slug:String(row.slug),name:String(row.product_name),category:row.category??null,image:row.image_url??null,
  company:companyById.get(row.company_id??"")??companyByUser.get(row.company_user_id??"")??"Company listing"
 }));
 return {companies,products};
}
export default async function Home() {
 const [currentJobs,market]=await Promise.all([loadVerifiedCurrentJobs(),loadHomepageMarket()]);
 return (
    <main>
      <SiteHeader />

      <section className="hero vc-home-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span/> VETCONNECT PAKISTAN</div>
            <h1>Find veterinary care, jobs and animal-health suppliers.<em> All in one place.</em></h1>
            <p className="hero-lead">Connect with veterinary professionals, discover sector-specific careers, and explore company products across Pakistan.</p>
            <div className="hero-actions">
              <Link href="/vets" className="button button-primary">Find a Veterinarian</Link>
              <Link href="/jobs" className="button button-secondary">Browse Jobs</Link>
            </div>
          </div>
          <div className="hero-search-card">
            <div className="search-card-head"><div><small>QUICK SEARCH</small><h2>Find a veterinarian</h2></div></div>
            <form action="/vets" method="get">
              <label htmlFor="vet-city">City</label>
              <select id="vet-city" name="city" defaultValue="">
                <option value="">All cities</option>
                <option value="Faisalabad">Faisalabad</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Multan">Multan</option>
              </select>
              <label htmlFor="vet-sector">Animal / sector</label>
              <select id="vet-sector" name="sector" defaultValue="">
                <option value="">All sectors</option>
                <option value="Livestock">Livestock</option>
                <option value="Dairy">Dairy</option>
                <option value="Poultry">Poultry</option>
                <option value="Pets">Pets</option>
                <option value="Fisheries">Fisheries</option>
                <option value="Equine">Equine</option>
              </select>
              <button className="button button-primary button-full" type="submit">Search professionals</button>
            </form>
          </div>
        </div>
      </section>
      <section className="section jobs-featured-below-hero">
        <div className="shell">
          <SectorJobSlider jobs={currentJobs}/>
        </div>
      </section>
      <div className="shell vc-home-jobs-quicklinks" aria-label="More job options">
        <Link href="/jobs">All jobs by sector →</Link>
        <Link href="/dashboard/career/cv">Create or update your CV →</Link>
        <Link href="/register?role=company#registration">Post a vacancy →</Link>
      </div>
      <HomeMarketLanes companies={market.companies} products={market.products}/>
      <section className="vc-home-discover">
        <div className="shell">
          <div className="vc-home-heading"><div><span className="section-kicker">EXPLORE VETCONNECT</span><h2>Where would you like to go?</h2></div></div>
          <div className="vc-home-destinations">
            <Link href="/vets"><strong>Veterinarians</strong><span>Find professional services for animals and farms</span></Link>
            <Link href="/clinics"><strong>Clinics & Hospitals</strong><span>Find local clinical services</span></Link>
            <Link href="/labs"><strong>Diagnostic Labs</strong><span>Explore testing services</span></Link>
            <Link href="/jobs"><strong>Jobs & Careers</strong><span>Vacancies and candidate profiles</span></Link>
            <Link href="/companies"><strong>Companies</strong><span>Browse animal-health businesses</span></Link>
            <Link href="/marketplace"><strong>Marketplace</strong><span>Find products and suppliers</span></Link>
          </div>
          <div className="vc-home-minor-links">
            <Link href="/learn">Learning & professional development →</Link>
            <a href="https://vetnewsandviews.com" rel="noopener noreferrer" target="_blank">Veterinary News & Views →</a>
          </div>
        </div>
      </section>
      <section className="vc-home-join">
        <div className="shell vc-home-join-inner">
          <div><span className="section-kicker">JOIN VETCONNECT</span><h2>Create your professional or company profile</h2><p>For veterinarians, job seekers, clinics and animal-health businesses.</p></div>
          <Link href="/register" className="button button-primary">Get Started →</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
