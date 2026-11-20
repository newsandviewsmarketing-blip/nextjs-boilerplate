import "../admin-compact.css";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import AdminNav from "@/app/admin/components/AdminNav";
import {requireSuperAdminTeamAccess} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {type TeamMember,teamPhotoUrl,TEAM_GROUPS,sortTeamMembers} from "@/lib/team-members";
import {validateSiteDocument,sourceSiteDocument,type SiteDocument} from "@/lib/site-content-document";
import {publishWebsiteDraftAction} from "@/app/admin/website/actions";
import FormSubmitButton from "@/app/components/FormSubmitButton";
import TeamPageSettings from "./TeamPageSettings";
import {unpublishTeamMember} from "./actions";
import TeamEditor from "./TeamEditor";
import styles from "./team-admin.module.css";

export const dynamic="force-dynamic";
export default async function TeamManagement({searchParams}:{searchParams:Promise<{edit?:string;message?:string}>}){
 const identity=await requireSuperAdminTeamAccess();
 const query=await searchParams;
 const db=await createClient();
 const [{data,error},pageDraft,pagePublished]=await Promise.all([
   db.from("team_members").select("*").order("sort_order").order("full_name"),
   db.from("site_content_drafts").select("document,revision").eq("slug","team").maybeSingle(),
   db.from("site_content_publications").select("document").eq("slug","team").maybeSingle()
 ]);
 let pageDoc:SiteDocument=sourceSiteDocument("team");
 let pageDraftValid=false;
 try{pageDoc=validateSiteDocument(pageDraft.data?.document,"team");pageDraftValid=true;}catch{/* Leave historical draft unmodified; allow new draft to be reviewed. */}
 const pageRevision=pageDraft.data?.revision??0;
 const members=sortTeamMembers((data??[]) as TeamMember[]);
 const selected=members.find(m=>m.id===query.edit);
 const published=members.filter(m=>m.is_published).length;
 return <div className="vc-admin-compact"><SiteHeader/><main className={styles.workspace}>
 <section className={styles.hero}><div className="shell">
  <span className={styles.eyebrow}>VETCONNECT CMS · WEBSITE MANAGEMENT</span><h1>Our Team Management</h1>
  <p>Manage leadership, biographies, original portraits, public links, SEO and publishing from one editorial workspace.</p>
  <div className={styles.heroActions}><Link href="/team" target="_blank" className="button button-secondary">View public team ↗</Link><a href="#page-settings" className="button button-secondary">Page introduction & SEO</a></div>
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
 <section id="page-settings" className={styles.editor} style={{marginTop:24}}>
  <div className={styles.editorHeader}><div><span className={styles.eyebrow}>ONE TEAM WORKSPACE</span><h2>Public Team Page · Introduction & SEO</h2><p>Manage public page wording here. Team member cards and their biographies remain above.</p></div></div>
  <div style={{padding:"16px 22px"}}>
   {(pageDraft.error||pagePublished.error)?<p role="alert">Page text editor is unavailable. Existing published wording has not been changed.</p>:<>
   <TeamPageSettings initial={pageDoc} revision={pageRevision}/>
   <details className="vc-admin-fold" style={{marginTop:18}}>
     <summary>Review & publish page introduction · Draft {pageRevision}</summary>
     <div>
       <p>Saving a page text draft does not publish it. Review the saved revision before updating the public Team heading, introduction and SEO.</p>
       {pageDraftValid?<form action={publishWebsiteDraftAction}>
         <input type="hidden" name="slug" value="team"/><input type="hidden" name="revision" value={pageRevision}/>
         <label className="checkbox-line"><input type="checkbox" name="confirm" value="publish" required/>I reviewed this saved Team page draft and approve its public wording.</label>
         <FormSubmitButton pendingLabel="Publishing..." className="button button-primary">Publish page introduction</FormSubmitButton>
       </form>:<p>The existing draft uses an older format. Save and review a new Team page draft first.</p>}
     </div>
   </details>
   <p style={{fontSize:12,color:"#6a7890",marginTop:12}}>Published page version: {String(pagePublished.data?.document?.version??"Website source")}. Historical records remain in the database.</p>
   </>}
  </div>
 </section>
 </>}
 </div></div></section></main><footer className="vc-admin-mini-footer"><span>© 2026 VetConnect Pakistan · Administration</span><Link href="/">Return to website</Link></footer></div>;
}
