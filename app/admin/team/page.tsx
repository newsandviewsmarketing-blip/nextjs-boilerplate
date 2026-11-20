import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdminNav from "@/app/admin/components/AdminNav";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {type TeamMember,teamPhotoUrl,TEAM_GROUPS,sortTeamMembers} from "@/lib/team-members";
import {saveTeamMember,unpublishTeamMember} from "./actions";
import styles from "./team-admin.module.css";

export const dynamic="force-dynamic";
export default async function TeamManagement({searchParams}:{searchParams:Promise<{edit?:string;message?:string}>}){
 const identity=await requireAdminPermission("site.manage","/admin/team");
 const query=await searchParams;
 const db=await createClient();
 const {data,error}=await db.from("team_members").select("*").order("sort_order").order("full_name");
 const members=sortTeamMembers((data??[]) as TeamMember[]);
 const selected=members.find(m=>m.id===query.edit);
 return <><SiteHeader/><main>
 <section className="dashboard-hero"><div className="shell"><span className="section-kicker">WEBSITE CONTENT</span><h1>Team Management</h1><p>Manage public-facing team portfolios. This does not change login accounts or staff access permissions.</p></div></section>
 <section className="section compact-section"><div className="shell admin-control-layout">
 <AdminNav roles={identity.roles}/>
 <div className="admin-control-content">
 {query.message&&<p role="status">{query.message}</p>}
 {error?<p role="alert">Team directory is not ready. Apply the team profile database migration before adding members.</p>:<>
 <div className={styles.top}><h2>Our Team profiles</h2><Link className="button button-secondary" href="/team" target="_blank">View public team</Link></div>
 <div className={styles.list}>{members.map(m=><div key={m.id} className={styles.person}>
  {teamPhotoUrl(m.photo_path)?<img src={teamPhotoUrl(m.photo_path)!} alt={m.full_name} width="58" height="65"/>:<div className={styles.blank}>Photo</div>}
  <div><strong>{m.full_name}</strong><p>{TEAM_GROUPS.find(g=>g.value===m.team_group)?.label??"Our Team"} · Position {m.sort_order} · {m.job_title} · {m.is_published?"Published":"Draft"}</p></div>
  <Link href={"/admin/team?edit="+m.id}>Edit profile</Link>
  {m.is_published&&<form action={unpublishTeamMember}><input type="hidden" name="id" value={m.id}/><button type="submit">Unpublish</button></form>}
 </div>)}</div>
 <section className={styles.editor}><h2>{selected?"Edit team member":"Add Team Member"}</h2>
 <p>Set the section (Chairman, Founder, Management or Team) and a numeric position to control the public order. All photos share the same portrait frame; adjust the vertical focal point without changing the original file. Keep photographs natural and approved for publication. The short summary appears on the card; the full biography opens under Read more.</p>
 <form action={saveTeamMember} key={selected?.id??"new"} encType="multipart/form-data">
  <input type="hidden" name="id" value={selected?.id??""}/>
  <div className={styles.fields}>
  <label>Full name *<input name="full_name" defaultValue={selected?.full_name??""} required maxLength={120}/></label>
  <label>Role / designation *<input name="job_title" defaultValue={selected?.job_title??""} placeholder="CEO / Finance Manager / Director" required maxLength={120}/></label>
  <label>Department<input name="department" defaultValue={selected?.department??""} placeholder="Executive Office" maxLength={120}/></label>
  <label>Profile URL slug *<input name="slug" defaultValue={selected?.slug??""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="member-name"/></label>
  <label>Section / hierarchy<select name="team_group" defaultValue={selected?.team_group??"team"}>{TEAM_GROUPS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
  <label>Display order within section<input name="sort_order" type="number" min="0" max="99999" defaultValue={selected?.sort_order??100}/></label>
  <label>Portrait photo (JPG / PNG / WebP, max 5 MB)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"/></label>
  </div>
  <label>Short introduction (card preview, max 500 characters)<textarea name="summary" rows={3} maxLength={500} defaultValue={selected?.summary??""}/></label>
  <label>Professional biography / history (paragraphs)<textarea name="biography" rows={8} maxLength={8000} defaultValue={selected?.biography??""}/></label>
  <div className={styles.fields}>
  <label>Expertise & responsibilities<textarea name="expertise" rows={3} defaultValue={selected?.expertise??""}/></label>
  <label>Education / qualifications<textarea name="qualifications" rows={3} defaultValue={selected?.qualifications??""}/></label>
  <label>Website link (HTTPS)<input name="website_url" type="url" defaultValue={selected?.website_url??""}/></label>
  <label>Facebook profile (HTTPS)<input name="facebook_url" type="url" defaultValue={selected?.facebook_url??""}/></label>
  <label>Photo vertical framing (0 = top, 100 = bottom)<input name="photo_position_y" type="number" min="0" max="100" defaultValue={selected?.photo_position_y??30}/></label>
  <label>SEO title<input name="seo_title" maxLength={160} defaultValue={selected?.seo_title??""} placeholder="Name | Designation | VetConnect"/></label>
  <label>SEO description<textarea name="seo_description" rows={2} maxLength={300} defaultValue={selected?.seo_description??""}/></label>
  <label>LinkedIn profile (HTTPS)<input name="linkedin_url" type="url" defaultValue={selected?.linkedin_url??""}/></label>
  <label>Public contact email (optional)<input name="email_public" type="email" defaultValue={selected?.email_public??""}/></label>
  </div>
  <label className={styles.publish}><input type="checkbox" name="is_published" defaultChecked={selected?.is_published??false}/> Publish this approved team profile</label>
  <div className={styles.top}><button type="submit" className="button button-primary">Save team profile</button><Link href="/admin/team">Add another / Clear form</Link></div>
 </form></section></>}
 </div></div></section></main><SiteFooter/></>;
}
