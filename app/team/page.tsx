import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import {publishedTeamMembers,teamPhotoUrl,TEAM_GROUPS} from "@/lib/team-members";
import styles from "./team.module.css";
import {getPublishedSiteDocument,siteContentMetadata} from "@/lib/site-content";
export const dynamic="force-dynamic";
export async function generateMetadata(){return siteContentMetadata("team");}
export default async function TeamPage(){
 const [members,pageContent]=await Promise.all([publishedTeamMembers(),getPublishedSiteDocument("team")]);
 const publishedIntro=pageContent.summary;
 const intro=/team profiles will be added|awaiting confirmation/i.test(publishedIntro)?"Meet the leadership and people behind VetConnect Pakistan.":publishedIntro;
 return <><SiteHeader/><main>
 <section className={styles.hero}><div className="shell"><span className={styles.kicker}>VETCONNECT PAKISTAN · OUR PEOPLE</span><h1>{pageContent.title}</h1><p>{intro}</p></div></section>
 <section className={styles.section}><div className="shell">
 {members.length?TEAM_GROUPS.map(group=>{
 const groupMembers=members.filter(member=>member.team_group===group.value);
 if(!groupMembers.length)return null;
 return <section className={styles.group} key={group.value} aria-labelledby={"team-group-"+group.value}>
  <div className={styles.groupHeading}><h2 id={"team-group-"+group.value}>{group.label}</h2></div>
  <div className={styles.grid}>{groupMembers.map(member=><article className={styles.card} key={member.id}>
  {teamPhotoUrl(member.photo_path)?<img className={styles.portrait} style={{objectPosition:"center "+member.photo_position_y+"%"}} src={teamPhotoUrl(member.photo_path)!} alt={"Portrait of "+member.full_name} loading="lazy"/>:<div className={styles.placeholder}>VetConnect Team</div>}
  <div className={styles.cardBody}><h3>{member.full_name}</h3><p className={styles.role}>{member.job_title}</p>
  {member.department&&<p className={styles.department}>{member.department}</p>}
  <p className={styles.summary}>{member.summary || "Read about this team member's role and professional background."}</p>
  <Link className={styles.readMore} href={"/team/"+member.slug} aria-label={"Read more about "+member.full_name}>Read more →</Link></div>
 </article>)}</div></section>;
 }):<p className={styles.intro}>Approved team profiles will be published here once their information and photographs are confirmed.</p>}
 </div></section></main><SiteFooter/></>;
}
