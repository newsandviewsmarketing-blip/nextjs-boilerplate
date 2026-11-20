import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import {publishedTeamMembers,teamPhotoUrl} from "@/lib/team-members";
import styles from "./team.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Our Team | VetConnect Pakistan",description:"Meet the people behind VetConnect Pakistan, their roles, professional backgrounds and responsibilities."};
export default async function TeamPage(){
 const members=await publishedTeamMembers();
 return <><SiteHeader/><main>
 <section className={styles.hero}><div className="shell"><span className={styles.kicker}>VETCONNECT PAKISTAN</span><h1>Meet Our Team</h1><p>The professionals working to connect veterinary services, animal health, livestock, industry, careers and learning across Pakistan.</p></div></section>
 <section className={styles.section}><div className="shell"><h2>Our People</h2><p className={styles.intro}>Leadership, operations and specialist expertise behind VetConnect Pakistan.</p>
 {members.length?<div className={styles.grid}>{members.map(member=><article className={styles.card} key={member.id}>
  {teamPhotoUrl(member.photo_path)?<img className={styles.portrait} src={teamPhotoUrl(member.photo_path)!} alt={member.full_name} loading="lazy"/>:<div className={styles.placeholder}>VetConnect Team</div>}
  <div className={styles.cardBody}><h2>{member.full_name}</h2><p className={styles.role}>{member.job_title}</p>
  {member.department&&<p className={styles.department}>{member.department}</p>}
  <p className={styles.summary}>{member.summary || "View this team member's professional background and responsibilities."}</p>
  <Link className={styles.readMore} href={"/team/"+member.slug}>Read more →</Link></div>
 </article>)}</div>:<p>Confirmed team profiles will appear here once their information and photographs have been approved for publication.</p>}
 </div></section></main><SiteFooter/></>;
}
