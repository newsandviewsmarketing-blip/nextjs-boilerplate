import Link from "next/link";
import {notFound} from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import FormMessage from "../../../../components/FormMessage";
import FormSubmitButton from "../../../../components/FormSubmitButton";
import AdminNav from "../../../components/AdminNav";
import {requireAdminPermission,getEffectiveAdminPermissions} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {reviewProfileAction,reviewVeterinarianCredentialAction} from "../../../actions";
import {correctDirectoryRecordAction} from "./actions";
import {isSuspiciousProfileName} from "@/lib/profile-name";

export const dynamic="force-dynamic";
const sourceMap={
 managed_person:{table:"managed_people",name:"full_name",uploadType:"person",label:"Assisted-entry professional"},
 company:{table:"companies",name:"canonical_name",uploadType:"company",label:"Company / firm"},
 clinic:{table:"clinics",name:"clinic_name",uploadType:"clinic",label:"Clinic / veterinary hospital"},
 laboratory:{table:"laboratories",name:"laboratory_name",uploadType:"laboratory",label:"Diagnostic laboratory"},
 job:{table:"jobs",name:"title",uploadType:"job",label:"Job listing"}
} as const;
const correctionFields={
 managed_person:["full_name","headline","professional_type","qualifications","specialization","veterinary_sector","public_summary","current_position","organization_name","city","province","district","tehsil","address"],
 company:["canonical_name","legal_name","trade_name","business_type","description","province","district","tehsil","city","address","public_phone","public_email"],
 clinic:["clinic_name","facility_type","description","province","district","tehsil","city","address","public_phone","public_email","working_hours"],
 laboratory:["laboratory_name","laboratory_type","technical_head","description","province","district","tehsil","city","address","public_phone","public_email","working_hours"],
 job:[]
} as const;
const ts=(at:unknown)=>typeof at==="string"&&at?new Date(at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"}):"Not recorded";
const show=(value:unknown)=>value===null||value===undefined||value===""?"Not provided":typeof value==="object"?JSON.stringify(value):String(value);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminDirectoryDossier({params,searchParams}:{params:Promise<{kind:string;id:string}>;searchParams:Promise<{error?:string;message?:string}>}){
 const {kind,id}=await params,feedback=await searchParams;
 const config=sourceMap[kind as keyof typeof sourceMap];
 if(!config||!uuid.test(id))notFound();
 const identity=await requireAdminPermission("directories.manage",`/admin/directory/${kind}/${id}`);
 const rights=await getEffectiveAdminPermissions(identity);
 const canEdit=rights.has("directories.manage")&&identity.roles.includes("super_admin")&&kind!=="job";
 const canReview=rights.has("profiles.review")&&kind!=="job";
 const canPVMC=rights.has("regulatory.review")&&kind==="managed_person";
 const supabase=await createClient();
 const [record,documents,audits]=await Promise.all([
   supabase.from(config.table).select("*").eq("id",id).maybeSingle(),
   supabase.from("admin_record_documents").select("id,entity_id,entity_type,original_name,document_kind,created_at,created_by,storage_path").eq("entity_id",id).eq("entity_type",config.uploadType).order("created_at",{ascending:false}).limit(40),
   supabase.from("audit_logs").select("id,created_at,action,entity_id,actor_id,metadata").eq("entity_id",id).order("created_at",{ascending:false}).limit(35)
 ]);
 if(record.error||!record.data)notFound();
 const data=record.data as Record<string,unknown>;
 const name=String(data[config.name]??"Untitled record").slice(0,150);
 const approved=data.verification_status==="approved",published=data.is_published===true;
 const specialistType=kind==="managed_person"?(data.profile_kind==="veterinarian"?"veterinarian":"professional"):kind==="company"?"company":kind==="clinic"?"clinic":kind==="laboratory"?"laboratory":"job";
 const publicHref=published?kind==="company"?`/companies/${id}`:kind==="clinic"?`/clinics/${String(data.slug)}`:kind==="laboratory"?`/labs/${String(data.slug)}`:kind==="job"?`/jobs/${String(data.slug)}`:kind==="managed_person"?(specialistType==="veterinarian"?`/vets/${id}`:`/professionals/${String(data.slug)}`):null:null;
 const files=await Promise.all((documents.data??[]).map(async item=>{const signed=await supabase.storage.from("record-documents").createSignedUrl(item.storage_path,600);return {...item,href:signed.data?.signedUrl??null};}));
 const linked=kind==="company"?await Promise.all([
   supabase.from("products").select("id,product_name,verification_status").eq("company_id",id).limit(50),
   supabase.from("jobs").select("id,title,verification_status").eq("company_id",id).limit(50)
 ]):null;
 const primary=kind!=="job"?correctionFields[kind as Exclude<keyof typeof correctionFields,"job">]:[];
 return <main className="vc-admin-page vc-editor-dossier">
  <SiteHeader/>
  <section className="vc-admin-banner"><div className="shell vc-admin-banner-content"><div>
    <span className="section-kicker">CANONICAL MANAGEMENT RECORD · {config.label.toUpperCase()}</span>
    <h1>{name}</h1><p>{kind.replaceAll("_"," ")} · {String(data.verification_status??"Not reviewed")} · Record {id.slice(0,8)} · Created {ts(data.created_at)}</p>
  </div><div className="vc-admin-actions"><Link href="/admin/directory" className="button button-secondary">Master directory</Link>
    {publicHref&&<Link className="button button-primary" href={publicHref} target="_blank" rel="noopener noreferrer">Open public page ↗</Link>}
  </div></div></section>
  <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout"><div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
    <div className="admin-control-content vc-admin-main">
      <FormMessage {...feedback}/>
      {isSuspiciousProfileName(name)&&<div className="vc-editor-alert"><strong>Potential promotional wording in the title/name</strong><p>Review this record before taking an approval or publication decision. Untrusted outbound links are intentionally not rendered as clickable URLs.</p></div>}
      <nav className="vc-editor-tabs" aria-label="Record navigation"><a href="#record-data">Submitted record</a><a href="#related-records">Related modules</a><a href="#record-files">Supporting files</a><a href="#record-actions">Actions</a><a href="#record-audit">Audit trail</a></nav>
      <section className="vc-admin-panel" id="record-data"><div className="vc-panel-header"><div><span className="section-kicker">SAVED FORM DATA</span><h2>All available fields</h2>
        <p>The values below come from this record&apos;s current database row, not necessarily the original submission snapshot.</p></div></div>
        <dl className="vc-editor-field-grid">{Object.entries(data).filter(([key])=>!/(token|secret|storage_path|private_notes)/i.test(key)).map(([field,value])=><div key={field}><dt>{field.replaceAll("_"," ")}</dt><dd>{show(value)}</dd></div>)}</dl>
        <div className="vc-editor-note"><b>Trace:</b> Created {ts(data.created_at)}, updated {ts(data.updated_at)}. Recorded creator: {data.created_by? <Link href={`/admin/users/${data.created_by}`} target="_blank" rel="noopener noreferrer">{String(data.created_by)} ↗</Link>:"Not recorded"}. The creator identifier is not a verified statement about the person who physically entered the data.</div>
      </section>
      <section className="vc-admin-panel" id="related-records"><div className="vc-panel-header"><div><span className="section-kicker">LINKED SUBJECTS</span><h2>Related business records</h2></div></div>
        {linked?<>
          <h3>Products ({linked[0].data?.length??0} listed)</h3>
          <div className="vc-editor-file-list">{(linked[0].data??[]).map(row=><div key={row.id}><strong>{row.product_name}</strong><span>{row.verification_status}</span>
            <Link href={`/admin/products/${row.id}`} target="_blank" rel="noopener noreferrer">Open product editor ↗</Link></div>)}</div>
          <h3>Jobs ({linked[1].data?.length??0} listed)</h3>
          <div className="vc-editor-file-list">{(linked[1].data??[]).map(row=><div key={row.id}><strong>{row.title}</strong><span>{row.verification_status}</span>
            <Link href={`/admin/jobs/${row.id}`} target="_blank" rel="noopener noreferrer">Open job dossier ↗</Link></div>)}</div>
        </>:kind==="job"?<div className="vc-editor-file-list"><Link href={`/admin/jobs/${id}`} target="_blank" rel="noopener noreferrer">Open specialized job management screen ↗</Link>
          {data.verification_status==="pending"&&<Link href={`/admin/reviews#job-${id}`} target="_blank" rel="noopener noreferrer">Review pending job ↗</Link>}</div>:
          <p>No separately joined product or job records are listed for this record type. For account-linked information, use the appropriate person/account dossier.</p>}
        <div className="vc-editor-note"><strong>Publication:</strong> {publicHref?<Link href={publicHref} target="_blank" rel="noopener noreferrer">Verified public route ↗</Link>:"No published public route in this record."} The admin record is never indexed as a public directory page.</div>
      </section>
      <section className="vc-admin-panel" id="record-files"><div className="vc-panel-header"><div><span className="section-kicker">MEDIA & DOCUMENT PROVENANCE</span><h2>Linked upload records</h2></div></div>
        {documents.error?<p role="alert">Supporting file metadata is unavailable.</p>:files.length?<div className="vc-editor-file-list">{files.map(doc=><div key={doc.id}><strong>{doc.original_name}</strong>
          <span>{doc.document_kind} · uploaded {ts(doc.created_at)}</span><span>Uploader reference: {doc.created_by??"Not captured"}</span>
          {doc.href?<a href={doc.href} target="_blank" rel="noopener noreferrer">Open authorized attachment in new tab ↗</a>:<small>File access not available</small>}
        </div>)}</div>:<p>No staff-managed attachments are linked to this record. Media supplied through other owner workflows may be stored separately.</p>}
      </section>
      <section className="vc-admin-panel" id="record-actions"><div className="vc-panel-header"><div><span className="section-kicker">EDITORIAL CONTROL</span><h2>Edit, review and manage</h2></div></div>
        {canEdit&&<details className="vc-editor-action" open><summary>Edit this {kind.replaceAll("_"," ")} record</summary>
          <form action={correctDirectoryRecordAction} className="vc-editor-form"><input type="hidden" name="record_kind" value={kind}/><input type="hidden" name="record_id" value={id}/>
          {primary.map(field=><div key={field}><label htmlFor={`dir-${field}`}>{field.replaceAll("_"," ")}</label>
             {field==="description"||field==="public_summary"?<textarea id={`dir-${field}`} name={field} maxLength={1800} defaultValue={String(data[field]??"")}/>:<input id={`dir-${field}`} name={field} maxLength={250} defaultValue={String(data[field]??"")}/>}
          </div>)}
          {approved&&<div><label htmlFor="acknowledge-live">Published content may update immediately. Type ACKNOWLEDGE to confirm this live edit.</label><input id="acknowledge-live" name="acknowledge_live_edit" autoComplete="off" placeholder="ACKNOWLEDGE" required/></div>}
          <p className="vc-editor-form-foot">These are approved text fields only. Changing verification, publication, slug, owner, PVMC credentials or upload paths requires its own controlled workflow.</p>
          <FormSubmitButton className="button button-primary" pendingLabel="Saving…">Save and audit corrections</FormSubmitButton></form>
        </details>}
        {canReview&&kind!=="job"&&<div className="vc-editor-action"><h3>Profile & publication decision</h3><p>Approvals and rejection change the directory visibility of this record. Check the submitted evidence before approving.</p>
          <form className="vc-editor-decision" action={reviewProfileAction}>
            <input type="hidden" name="profile_type" value={specialistType}/><input type="hidden" name="record_source" value={kind==="managed_person"?"managed_people":kind==="company"?"companies":kind==="clinic"?"clinics":"laboratories"}/>
            <input type="hidden" name="user_id" value={id}/><input type="hidden" name="entity_id" value={id}/>
            <input type="hidden" name="return_to" value={`/admin/directory/${kind}/${id}`}/>
            <label htmlFor="directory-review-note">Reviewer note / verification or rejection reason</label><input id="directory-review-note" name="reason" placeholder="Record evidence and decision"/>
            <div className="vc-editor-buttons">{!approved&&<FormSubmitButton className="button button-primary" pendingLabel="Approving… " name="decision" value="approved">Approve profile</FormSubmitButton>}
              <button className="button button-secondary" name="decision" value="rejected" type="submit">{approved?"Unpublish / return for correction":"Reject / return"}</button></div>
          </form>
        </div>}
        {canPVMC&&kind==="managed_person"&&specialistType==="veterinarian"&&approved&&data.pvmc_verification_status==="pending"&&<div className="vc-editor-action">
         <h3>Separate PVMC verification</h3><form action={reviewVeterinarianCredentialAction} className="vc-editor-decision">
          <input type="hidden" name="user_id" value={id}/><input type="hidden" name="record_source" value="managed_people"/><input type="hidden" name="return_to" value={`/admin/directory/${kind}/${id}`}/>
          <label htmlFor="managed-credential-note">Evidence source and reviewer note</label><input id="managed-credential-note" name="reason"/>
          <div className="vc-editor-buttons"><FormSubmitButton className="button button-primary" name="decision" value="approved" pendingLabel="Verifying…">Verify PVMC</FormSubmitButton>
            <button className="button button-secondary" name="decision" value="rejected" type="submit">Reject credential</button></div>
         </form></div>}
        {!canEdit&&!canReview&&<p>Access is restricted to the assigned administrator permissions.</p>}
      </section>
      <section className="vc-admin-panel" id="record-audit"><div className="vc-panel-header"><div><span className="section-kicker">GOVERNANCE</span><h2>Recorded actions</h2><p>Audit entries are available only where the platform wrote them.</p></div></div>
      {audits.error?<p role="alert">Audit trail could not be retrieved.</p>:(audits.data??[]).length?<div className="vc-editor-audit">{(audits.data??[]).map(row=><article key={row.id}>
        <strong>{row.action}</strong><span>{ts(row.created_at)} · actor {row.actor_id||"Unknown"}</span>
        {row.metadata&&<details><summary>Decision details</summary><pre>{JSON.stringify(row.metadata,null,2)}</pre></details>}
      </article>)}</div>:<p>No historical audit records found for this entity. The original creation method may not have been logged.</p>}
      </section>
    </div>
  </div></section><SiteFooter/></main>;
}
