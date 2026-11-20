import Link from "next/link";
import {notFound} from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import {createClient} from "@/lib/supabase/server";
import {teamPhotoUrl,type TeamMember} from "@/lib/team-members";
import styles from "../team.module.css";
export const dynamic="force-dynamic";
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
  <div style={{display:"grid",gridTemplateColumns:"minmax(190px,280px) minmax(0,1fr)",gap:"2rem",alignItems:"start",marginTop:"2rem"}}>
   <div>{teamPhotoUrl(member.photo_path)?<img className={styles.portrait} src={teamPhotoUrl(member.photo_path)!} alt={member.full_name}/>:<div className={styles.placeholder}>VetConnect Team</div>}</div>
   <article><h2>Professional Profile</h2>{member.summary&&<p>{member.summary}</p>}
   {member.biography.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
   {member.expertise&&<><h3>Responsibilities & Expertise</h3><p style={{whiteSpace:"pre-line"}}>{member.expertise}</p></>}
   {member.qualifications&&<><h3>Education & Qualifications</h3><p style={{whiteSpace:"pre-line"}}>{member.qualifications}</p></>}
   {member.linkedin_url&&<p><a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn profile</a></p>}
   {member.email_public&&<p><a href={"mailto:"+member.email_public}>Contact by email</a></p>}
   </article>
  </div></div></section></main><SiteFooter/></>;
}
