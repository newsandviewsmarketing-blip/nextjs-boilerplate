import "../admin-compact.css";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import AdminNav from "@/app/admin/components/AdminNav";
import {requireSuperAdminTeamAccess} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {type TeamMember,teamPhotoUrl,TEAM_GROUPS,sortTeamMembers} from "@/lib/team-members";
import {unpublishTeamMember} from "./actions";
import TeamEditor from "./TeamEditor";
import styles from "./team-admin.module.css";

export const dynamic="force-dynamic";
export default async function TeamManagement({searchParams}:{searchParams:Promise<{edit?:string;message?:string}>}){
 const identity=await requireSuperAdminTeamAccess();
 const query=await searchParams;
 const db=await createClient();
 const {data,error}=await db.from("team_members").select("*").order("sort_order").order("full_name");
 const members=sortTeamMembers((data??[]) as TeamMember[]);
 const selected=members.find(m=>m.id===query.edit);
 const published=members.filter(m=>m.is_published).length;
 return <div className="vc-admin-compact"><SiteHeader/><main className={styles.workspace}>
 <section className={styles.hero}><div className="shell">
  <span className={styles.eyebrow}>VETCONNECT CMS · WEBSITE MANAGEMENT</span><h1>Our Team Management</h1>
  <p>Manage leadership, biographies, original portraits, public links, SEO and publishing from one editorial workspace.</p>
  <div className={styles.heroActions}><Link href="/team" target="_blank" className="button button-secondary">View public team ↗</Link><Link href="/admin/website?slug=team" className="button button-secondary">Edit page introduction</Link></div>
 </div></section>
 <section className="section compact-section"><div className="shell admin-control-layout">
 <AdminNav roles={identity.roles} activeGroup="Governance & data"/>
 <div className="admin-control-content">
 {query.message&&<div className={styles.notice} role="status">{query.message}</div>}
 {error?<div className={styles.notice} role="alert">Team database unavailable. No changes have been made.</div>:<>
 <div className={styles.metrics}>
  <div><span>Total members</span><strong>{members.length}</strong><small>Saved profiles</small></div>
  <div><span>Published</span><strong>{published}</strong><small>Public profiles</small></div>
  <div><span>Private drafts</span><strong>{members.length-published}</strong><small>Not publicly visible</small></div>
 </div>
 <div className={styles.headingRow}><div><span className={styles.eyebrow}>EDITORIAL DIRECTORY</span><h2>Members & display order</h2><p>Arrange Chairman, Founder, Leadership, Management, Team and Advisors. Position controls order within each section.</p></div><a className="button button-primary" href="#team-editor">+ Add member</a></div>
 <div className={styles.members}>
 {members.length?members.map((m,index)=><div className={styles.memberRow} key={m.id}>
   <span className={styles.position}>{index+1}</span>
   {teamPhotoUrl(m.photo_path)?<img className={styles.miniPortrait} src={teamPhotoUrl(m.photo_path)!} alt={"Portrait of "+m.full_name}/>:<div className={styles.miniEmpty}>Photo</div>}
   <div className={styles.memberDetails}><strong>{m.full_name}</strong><span>{m.job_title}</span><small>{TEAM_GROUPS.find(x=>x.value===m.team_group)?.label??"Team"} · Position {m.sort_order}</small></div>
   <span className={m.is_published?styles.published:styles.draft}>{m.is_published?"Published":"Draft"}</span>
   <Link href={"/admin/team?edit="+m.id+"#team-editor"}>Edit</Link>
   {m.is_published&&<form action={unpublishTeamMember}><input type="hidden" name="id" value={m.id}/><button type="submit">Unpublish</button></form>}
  </div>):<div className={styles.empty}><h3>No team profiles yet</h3><p>Add a member with an approved original portrait, professional role and biography. You control when it is published.</p></div>}
 </div>
 <TeamEditor key={selected?.id??"new"} selected={selected}/>
 </>}
 </div></div></section></main><footer className="vc-admin-mini-footer"><span>© 2026 VetConnect Pakistan · Administration</span><Link href="/">Return to website</Link></footer></div>;
}
