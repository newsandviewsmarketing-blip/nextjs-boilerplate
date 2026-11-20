import "../admin-compact.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdminNav from "../components/AdminNav";
import FormMessage from "@/app/components/FormMessage";
import FormSubmitButton from "@/app/components/FormSubmitButton";
import { getCurrentIdentity } from "@/lib/auth";
import { getEffectiveAdminPermissions } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_INFORMATION_LINKS } from "@/lib/public-information";
import { isSiteSlug, sourceSiteDocument, validateSiteDocument, type SiteDocument } from "@/lib/site-content-document";
import WebsiteEditor from "./WebsiteEditor";
import { publishWebsiteDraftAction, restoreWebsiteDraftAction } from "./actions";

export const dynamic = "force-dynamic";
type History = {id:number;event:string;document:unknown;occurred_at:string};
export default async function WebsitePages({searchParams}:{searchParams:Promise<{slug?:string;message?:string}>}) {
  const params=await searchParams;
  const identity=await getCurrentIdentity();
  if(!identity)redirect("/login?next=/admin/website");
  const rights=await getEffectiveAdminPermissions(identity);
  if(!rights.has("site.manage")&&!rights.has("site_content.edit"))redirect("/dashboard?error=Website%20content%20permission%20required.");
  const slug=isSiteSlug(params.slug)?params.slug:"about";
  const db=await createClient();
  const [gate,draft,publication,history]=await Promise.all([
    db.rpc("site_content_can_edit"),
    db.from("site_content_drafts").select("document,revision,updated_at").eq("slug",slug).maybeSingle(),
    db.from("site_content_publications").select("document,published_at").eq("slug",slug).maybeSingle(),
    db.from("site_content_history").select("id,event,document,occurred_at").eq("slug",slug).order("id",{ascending:false}).limit(30),
  ]);
  const ready=!gate.error&&gate.data===true&&!draft.error&&!publication.error&&!history.error;
  let initial:SiteDocument=sourceSiteDocument(slug);
  let draftValid=false;
  try { initial=validateSiteDocument(draft.data?.document,slug);draftValid=true; } catch { /* Latest reviewed source stays available for legacy drafts. */ }
  const revision=draft.data?.revision??0;
  const canPublish=rights.has("site.manage");
  return <div className="vc-admin-compact"><SiteHeader/><main>
    <section className="dashboard-hero"><div className="shell"><span className="section-kicker">CONTENT MANAGEMENT</span><h1>Website Pages</h1><p>Manage the page introduction, SEO and publication history. Team member profiles and photos have their own workspace.</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout"><AdminNav roles={identity.roles} activeGroup="Governance & data"/>
      <div className="admin-control-content">
        <nav aria-label="Choose website page" className="management-links">{PUBLIC_INFORMATION_LINKS.map(p=><Link className="button button-secondary" href={"/admin/website?slug="+p.slug} aria-current={p.slug===slug?"page":undefined} key={p.slug}>{p.label}</Link>)}</nav>
        <FormMessage message={params.message} error={!ready?"Website editing is unavailable. No changes have been made.":undefined}/>
        {ready?<><section className="backend-form-card">
          <h2>{initial.title}</h2><p>Saved draft revision: {revision}. Published version: {String(publication.data?.document?.version??"Website source")}.</p>
          {!draftValid?<p>The existing saved text uses an older format. The editor starts with the latest website source; saving creates a new draft. Older text remains in history.</p>:null}
          {slug==="team"&&<div style={{background:"#edf4ff",border:"1px solid #cfdff5",borderRadius:12,padding:"1rem 1.2rem",margin:"1rem 0"}}>
  <strong>Team profiles, photos and display order</strong>
  <p style={{margin:".4rem 0 .8rem"}}>This editor manages the public Team page introduction and SEO. Use the dedicated Team Management workspace to add people, upload original portraits, set Chairman/Founder hierarchy, edit biographies and publish profiles.</p>
  <Link href="/admin/team" className="button button-primary">Open Team Management →</Link>
</div>}
<p><Link href={"/"+slug} target="_blank" rel="noopener noreferrer">Open public page</Link></p>
          <WebsiteEditor key={slug+":"+revision} initial={initial} revision={revision}/>
        </section>
        <details className="vc-admin-fold"><summary>Publish saved revision · {revision}</summary><div><h2>Publication approval</h2>
          <p>Publishing uses the saved draft, not unsaved fields above. Update the version whenever public wording changes. Publishing a policy does not record user agreement to it.</p>
          {canPublish&&draftValid?<form action={publishWebsiteDraftAction}>
            <input type="hidden" name="slug" value={slug}/><input type="hidden" name="revision" value={revision}/>
            <label className="checkbox-line"><input type="checkbox" name="confirm" value="publish" required/>I reviewed saved revision {revision} and approve its public wording.</label>
            <FormSubmitButton pendingLabel="Publishing..." className="button button-primary">Publish reviewed revision {revision}</FormSubmitButton>
          </form>:<p>{canPublish?"Save a new-format draft before publishing.":"Your access allows draft editing. Publishing requires the website publisher permission."}</p>}
        </div></details>
        <details className="vc-admin-fold"><summary>Version history · {(history.data as History[]??[]).length} records</summary><div><h2>Previous revisions</h2><p>Latest 30 events. Restore creates a new private draft and keeps the original history.</p>
          {(history.data as History[]??[]).map(row=><details key={row.id}><summary>{row.event} · {row.occurred_at} · Event {row.id}</summary>
            <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:300,overflow:"auto"}}>{JSON.stringify(row.document,null,2)}</pre>
            <form action={restoreWebsiteDraftAction}><input type="hidden" name="slug" value={slug}/><input type="hidden" name="revision" value={revision}/><input type="hidden" name="history_id" value={String(row.id)}/>
              <FormSubmitButton pendingLabel="Restoring..." className="button button-secondary">Restore as new draft</FormSubmitButton>
            </form></details>)}
        </div></details></>:null}
      </div>
    </div></section>
  </main><SiteFooter/></div>;
}
