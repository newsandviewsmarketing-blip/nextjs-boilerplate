import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import {createClient} from "@/lib/supabase/server";
import {teamPhotoUrl,type TeamMember} from "@/lib/team-members";
import styles from "../team.module.css";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;
 const db=await createClient();
 const {data}=await db.from("team_members").select("full_name,job_title,summary,seo_title,seo_description,photo_path").eq("slug",slug).eq("is_published",true).maybeSingle();
 if(!data)return {title:"Team member not found | VetConnect Pakistan",robots:{index:false}};
 const title=data.seo_title || data.full_name+" | "+data.job_title+" | VetConnect Pakistan";
 const description=data.seo_description || data.summary || "Meet the VetConnect Pakistan team.";
 const photo=teamPhotoUrl(data.photo_path);
 return {title,description,alternates:{canonical:"/team/"+slug},
  openGraph:{title,description,type:"profile",...(photo?{images:[{url:photo,alt:"Portrait of "+data.full_name}]}:{})},
  twitter:{card:"summary_large_image",title,description}};
}
export default async function MemberProfile({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const db=await createClient();
 const {data}=await db.from("team_members").select("*").eq("slug",slug).eq("is_published",true).maybeSingle();
 if(!data)notFound();
 const member=data as TeamMember;
 return <><SiteHeader/><main>
  <section className={styles.hero}><div className="shell"><span className={styles.kicker}>OUR PEOPLE</span><h1>{member.full_name}</h1><p>{member.job_title}{member.department?" · "+member.department:""}</p></div></section>
  <section className={styles.section}><div className="shell">
  <Link href="/team">← Back to Our Team</Link>
  <div className={styles.profileLayout}>
   <div>{teamPhotoUrl(member.photo_path)?<img className={styles.profilePhoto} style={{objectPosition:"center "+member.photo_position_y+"%"}} src={teamPhotoUrl(member.photo_path)!} alt={"Portrait of "+member.full_name}/>:<div className={styles.placeholder}>VetConnect Team</div>}</div>
   <article className={styles.profileText}><h2>Professional Profile</h2>{member.summary&&<p>{member.summary}</p>}
   {member.biography.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
   {member.expertise&&<><h3>Responsibilities & Expertise</h3><p style={{whiteSpace:"pre-line"}}>{member.expertise}</p></>}
   {member.qualifications&&<><h3>Education & Qualifications</h3><p style={{whiteSpace:"pre-line"}}>{member.qualifications}</p></>}
   <nav className={styles.profileLinks} aria-label="Professional links">
   {member.website_url&&<a href={member.website_url} target="_blank" rel="noopener noreferrer">Website</a>}
   {member.linkedin_url&&<a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
   {member.facebook_url&&<a href={member.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a>}
  </nav>
   {member.email_public&&<p><a href={"mailto:"+member.email_public}>Contact by email</a></p>}
   </article>
  </div></div></section></main><SiteFooter/></>;
}
