import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import SectorJobSlider,{type CurrentJobSlide} from "./components/SectorJobSlider";
import HomeMarketLanes,{type HomeCompany,type HomeProduct} from "./components/HomeMarketLanes";
import HomeQuickSearch from "./components/HomeQuickSearch";
import HomeAdPlacement from "./components/HomeAdPlacement";
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
   sector:job.sector && approvedSectors.has(job.sector.trim().toLowerCase()) ? job.sector.trim() : "Other sectors",
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
    <main className="vc-homepage">
      <SiteHeader />

      <section className="hero vc-home-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span/> VETCONNECT PAKISTAN</div>
            <h1>Connecting veterinary expertise with <em>farmers, animal owners and industry.</em></h1>
            <p className="hero-lead">Find veterinary clinics and professionals, discover sector-specific jobs, and connect with animal-health companies across Pakistan.</p>
            <div className="hero-actions">
              <Link href="/vets" className="button button-primary">Find a Veterinarian</Link>
              <Link href="/jobs" className="button button-secondary">Browse Jobs</Link>
            </div>
          </div>
          <HomeQuickSearch />
        </div>
      </section>
      <section className="section jobs-featured-below-hero">
        <div className="shell">
          <SectorJobSlider jobs={currentJobs}/>
        </div>
      </section>
      <HomeMarketLanes companies={market.companies} products={market.products}/>
      <HomeAdPlacement />
      <SiteFooter />
    </main>
  );
}
