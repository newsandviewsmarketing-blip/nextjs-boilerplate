import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import {plainCompanyDescription} from "../components/CompanyStory";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { companyInitials, type PublicCompany } from "@/lib/marketplace";
import { COMPANY_SECTOR_LABELS, COMPANY_CLASSIFICATION } from "@/lib/company-classification";
import "./directory.css";

export const metadata:Metadata={title:"Veterinary & Animal Health Companies",description:"Browse approved veterinary, livestock, poultry, dairy, feed, diagnostics and animal-health companies.",alternates:{canonical:"/companies"}};
export const dynamic="force-dynamic";
const norm=(s:string)=>s.trim().toLowerCase();
function businessLabels(raw:string|null){
  return [...new Map((raw??"").split(",").map(s=>s.trim()).filter(Boolean).map(s=>[norm(s),s])).values()];
}
// Legacy labels remain record-supplied; only exact master labels/subsectors are normalized.
// Never infer company sectors from unrelated activity or description.
function sectorLabels(raw:string|null){
  const labels=businessLabels(raw);
  return [...new Set(labels.map(label=>{
    for(const [key,title] of Object.entries(COMPANY_SECTOR_LABELS)){
      if(norm(label)===norm(key)||norm(label)===norm(title))return title;
    }
    return label;
  }))];
}
function shortIntro(c:PublicCompany,tagline?:string){
  const raw=plainCompanyDescription(tagline||c.description||"");
  const value=raw.toLowerCase().startsWith(c.company_name.toLowerCase())?raw.slice(c.company_name.length).trim():raw;
  const clean=value.replace(/^about the company\s*/i,"").trim();
  if(!clean)return "View the company profile for more information.";
  if(clean.length<=140)return clean;
  const cut=clean.slice(0,137);const last=cut.lastIndexOf(" ");
  return (last>60?cut.slice(0,last):cut)+"…";
}
async function loadCompanies(){
  if(!isSupabaseConfigured())return {companies:[] as PublicCompany[],taglines:new Map<string,string>(),error:true};
  const supabase=await createClient();
  const {data,error}=await supabase.from("public_company_directory").select("id,user_id,company_name,business_type,city,province,district,tehsil,address,description,website,contact_email,public_phone,google_maps_url,logo_url").order("company_name");
  if(error)return {companies:[] as PublicCompany[],taglines:new Map<string,string>(),error:true};
  const companies=(data??[]) as PublicCompany[];
  const ids=companies.flatMap(c=>c.id?[c.id]:[]);
  const taglines=new Map<string,string>();
  if(ids.length){const {data:content}=await supabase.from("company_profile_content").select("company_id,tagline").in("company_id",ids);for(const row of content??[])if(row.tagline)taglines.set(row.company_id,row.tagline);}
  return {companies,taglines,error:false};
}
export default async function CompaniesPage({searchParams}:{searchParams:Promise<{q?:string;type?:string;page?:string}>}){
 const params=await searchParams;const {companies,taglines,error}=await loadCompanies();
 const q=norm(params.q??"");const selected=norm(params.type??"");
 const types=[...new Map(companies.flatMap(c=>sectorLabels(c.business_type)).map(s=>[norm(s),s])).values()].sort((a,b)=>a.localeCompare(b));
 const master=Object.entries(COMPANY_SECTOR_LABELS).map(([key,label])=>({key,label,children:COMPANY_CLASSIFICATION[key as keyof typeof COMPANY_CLASSIFICATION] as readonly string[]}));
 const matchesType=(c:PublicCompany)=>!selected||selected==="all business types"||sectorLabels(c.business_type).some(label=>norm(label)===selected)||businessLabels(c.business_type).some(label=>norm(label)===selected)||master.some(s=>norm(s.label)===selected&&sectorLabels(c.business_type).some(label=>s.children.some(child=>norm(child)===norm(label))));
 const visible=companies.filter(c=>(!q||norm([c.company_name,c.business_type??"",c.city??"",taglines.get(c.id??"")??"",plainCompanyDescription(c.description??"")].join(" ")).includes(q))&&matchesType(c));
 const pageSize=18;const pages=Math.max(1,Math.ceil(visible.length/pageSize));const page=Math.min(pages,Math.max(1,Number.parseInt(params.page??"1",10)||1));
 const href=(n:number)=>"/companies?"+new URLSearchParams({q:params.q??"",type:params.type??"",page:String(n)}).toString();
 return <main className="vc-company-directory"><SiteHeader/>
 <section className="page-hero"><div className="shell"><span className="section-kicker">COMPANY DIRECTORY</span><h1>Animal health companies</h1><p>Discover verified businesses, suppliers and industry partners.</p><div className="hero-actions"><Link className="button button-primary" href="/register?role=company#registration">Register a company</Link></div></div></section>
 <section className="section compact-section"><div className="shell"><div className="directory-top"><div><b>{visible.length} company profiles</b><span>Administrator-approved directory</span></div><form className="market-search" method="get"><input name="q" aria-label="Search companies" defaultValue={params.q??""} placeholder="Search company or sector"/><select name="type" aria-label="Business category" defaultValue={params.type??""}><option value="">All business categories</option>{types.map(t=><option key={t}>{t}</option>)}</select><button className="button button-primary" type="submit">Search</button></form></div>
 {error?<div className="empty-state">Company directory is temporarily unavailable.</div>:visible.length===0?<div className="empty-state"><h2>No approved companies match this search.</h2><Link href="/companies">Clear search</Link></div>:<div className="vc-directory-grid">{visible.slice((page-1)*pageSize,page*pageSize).map(c=>{
 const id=c.id??c.user_id;if(!id)return null;const labels=sectorLabels(c.business_type);const location=[c.city,c.province].filter((v,i,a)=>v&&a.findIndex(w=>w?.toLowerCase()===v.toLowerCase())===i).join(", ");
 return <article className="vc-directory-card" key={id}><div className="vc-directory-logo">{c.logo_url?<img src={c.logo_url} alt={c.company_name+" logo"} loading="lazy" decoding="async" width={180} height={110}/>:<span aria-label={c.company_name+" initials"}>{companyInitials(c.company_name)}</span>}</div><h3><Link href={"/companies/"+id}>{c.company_name}</Link></h3><div className="vc-directory-tags">{labels.slice(0,4).map(t=><Link key={t} href={"/companies?"+new URLSearchParams({type:t}).toString()}>{t}</Link>)}{labels.length>4&&<span>+{labels.length-4} more</span>}</div><p className="vc-directory-intro">{shortIntro(c,taglines.get(id))}</p><div className="vc-directory-location">{location||"Location not specified"}</div><Link className="button button-primary button-full vc-directory-read" href={"/companies/"+id}>Read more</Link></article>})}</div>}
 {pages>1&&<nav className="vc-directory-pagination" aria-label="Company pages">{page>1&&<Link href={href(page-1)}>Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={href(page+1)}>Next</Link>}</nav>}
 </div></section><SiteFooter/></main>;
}
