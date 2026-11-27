import type { MetadataRoute } from "next";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseConfig} from "@/lib/supabase/config";
import {absoluteUrl} from "@/lib/seo";
import {PUBLIC_INFORMATION_LINKS} from "@/lib/public-information";
export const revalidate=3600;
const publicRoutes=["/","/vets","/professionals","/clinics","/labs","/companies","/marketplace","/jobs","/learn",...PUBLIC_INFORMATION_LINKS.map(item=>"/"+item.slug)];
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const urls=new Set(publicRoutes);
 const {url,publishableKey}=getSupabaseConfig();
 if(url&&publishableKey){
  // Anonymous client: never use session cookies or a service-role key for indexing.
  const db=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const sources=[
   ["public_veterinarians","user_id","/vets/",true],
   ["public_managed_veterinarians","user_id","/vets/",true],
   ["public_professionals","slug","/professionals/",true],
   ["public_managed_professionals","slug","/professionals/",true],
   ["public_clinics","slug","/clinics/",true],
   ["public_jobs","slug","/jobs/",false],
   ["products","slug","/marketplace/",false],
  ] as const;
  const results=await Promise.all(sources.map(async ([table,key,prefix,verified])=>{
   const paths:string[]=[];
   for(let offset=0;offset<5000;offset+=500){
    let q=db.from(table).select(key).order(key).range(offset,offset+499);
    if(verified)q=q.eq("profile_verified",true);
    if(table==="products")q=q.eq("verification_status","approved").eq("is_published",true);
    const {data,error}=await q;
    if(error)return [];
    for(const row of data??[]){const value=(row as unknown as Record<string,unknown>)[key];if(typeof value==="string"&&/^[a-zA-Z0-9_-]{1,200}$/.test(value))paths.push(prefix+encodeURIComponent(value));}
    if(!data||data.length<500)break;
   }
   return paths;
  }));
  for(const entries of results)for(const path of entries)urls.add(path);
 }
 return [...urls].map(path=>({url:absoluteUrl(path),changeFrequency:path==="/"?"daily":"weekly",priority:path==="/"?1:0.7}));
}
