import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import AdminNav from "../../components/AdminNav";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermissions,permissionOptions,staffRoleOptions} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {isSuspiciousProfileName} from "@/lib/profile-name";
import {correctUserDossierAction,correctSpecialistDossierAction} from "./actions";
import {updateUserStatusAction,updateStaffRolesAction,updateUserPermissionsAction} from "../actions";
import {reviewProfileAction,reviewVeterinarianCredentialAction} from "../../actions";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>;searchParams:Promise<{error?:string;message?:string}>};
type Item=Record<string,unknown>;
const stamp=(v:unknown)=>typeof v==="string"&&v?new Date(v).toLocaleString("en-PK",{timeZone:"Asia/Karachi"}):"Not recorded";
const safeName=(v:unknown)=>String(v??"").slice(0,140);
const display=(v:unknown)=>{
 if(v===null||v===undefined||v==="")return "Not supplied";
 if(Array.isArray(v))return v.length?v.map(String).join(", "):"None";
 if(typeof v==="object")return JSON.stringify(v);
 return String(v);
};
const noInternal=(entries:[string,unknown][])=>entries.filter(([name])=>!/(token|secret|password|storage_path|file_path|private_notes)/i.test(name));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminUserDossier({params,searchParams}:Props){
 const {id}=await params, notices=await searchParams;
 if(!uuid.test(id))notFound();
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next="+encodeURIComponent("/admin/users/"+id));
 const rights=await getEffectiveAdminPermissions(identity);
 const canView=rights.has("users.manage")||rights.has("directories.manage");
 if(!canView)redirect("/dashboard?error=Admin%20access%20is%20required");
 const isSuperAdmin=identity.roles.includes("super_admin");
 const canManage=isSuperAdmin&&rights.has("users.manage");
 const canReview=rights.has("profiles.review");
 const canRegulatory=rights.has("regulatory.review");
 const canInspectPrivate=canManage||canReview||canRegulatory;
 const supabase=await createClient();
 const [profile,vet,professional,company,staffRoles,permissions,credentials,memberships,audit,verification,uploads,careerFiles,education,experience]=await Promise.all([
  supabase.from("profiles").select("*").eq("id",id).maybeSingle(),
  supabase.from("veterinarian_profiles").select("*").eq("user_id",id).maybeSingle(),
  supabase.from("professional_profiles").select("*").eq("user_id",id).maybeSingle(),
  supabase.from("company_profiles").select("*").eq("user_id",id).maybeSingle(),
  supabase.from("user_roles").select("role").eq("user_id",id),
  canManage?supabase.from("admin_user_permissions").select("granted_permissions,revoked_permissions").eq("user_id",id).maybeSingle():Promise.resolve({data:null,error:null}),
  canInspectPrivate?supabase.from("professional_credentials").select("id,credential_type,issuing_authority,verification_status,created_at").eq("professional_user_id",id).order("created_at",{ascending:false}).limit(40):Promise.resolve({data:[],error:null}),
  supabase.from("company_members").select("company_id,member_role,membership_status,verification_status,created_at").eq("user_id",id).limit(25),
  canManage?supabase.from("audit_logs").select("id,action,entity_type,entity_id,actor_id,metadata,created_at").or(`entity_id.eq.${id},actor_id.eq.${id}`).order("created_at",{ascending:false}).limit(50):Promise.resolve({data:[],error:null}),
  canRegulatory?supabase.from("verification_records").select("id,entity_type,verification_type,status,reviewed_by,reviewed_at,created_at").eq("entity_id",id).order("created_at",{ascending:false}).limit(30):Promise.resolve({data:[],error:null}),
  canManage?supabase.from("admin_record_documents").select("id,entity_type,entity_id,document_kind,original_name,storage_path,created_at,created_by").eq("entity_id",id).order("created_at",{ascending:false}).limit(40):Promise.resolve({data:[],error:null}),
  canManage?supabase.from("career_documents").select("id,document_type,created_at").eq("professional_user_id",id).order("created_at",{ascending:false}).limit(25):Promise.resolve({data:[],error:null}),
  canInspectPrivate?supabase.from("professional_education").select("*").eq("professional_user_id",id).limit(40):Promise.resolve({data:[],error:null}),
  canInspectPrivate?supabase.from("professional_experience").select("*").eq("professional_user_id",id).limit(40):Promise.resolve({data:[],error:null})
 ]);
 if(profile.error||!profile.data)notFound();
 const p=profile.data as Item, v=vet.data as Item|null, pr=professional.data as Item|null, co=company.data as Item|null;
 const role=String(p.primary_role??"user"),accountStatus=String(p.account_status??"unknown");
 const roles=(staffRoles.data??[]).map(x=>String(x.role));
 const granted=new Set<string>(Array.isArray(permissions.data?.granted_permissions)?permissions.data.granted_permissions:[]);
 const revoked=new Set<string>(Array.isArray(permissions.data?.revoked_permissions)?permissions.data.revoked_permissions:[]);
 const publicVet=accountStatus==="active"&&v?.verification_status==="approved"&&v?.pvmc_verification_status==="approved";
 const publicPro=accountStatus==="active"&&pr?.verification_status==="approved"&&pr?.profile_visibility==="public";
 const label=isSuspiciousProfileName(String(p.full_name??"")) ? `Flagged account · ${id.slice(0,8)}` : safeName(p.full_name||p.email||"Unnamed account");
 const publicHref=publicVet?"/vets/"+id:publicPro&&pr?.slug?"/professionals/"+pr.slug:null;
 const alertSpam=isSuspiciousProfileName(String(p.full_name??""));
 const docLinks=await Promise.all((uploads.data??[]).map(async row=>{
   const {data}=await supabase.storage.from("record-documents").createSignedUrl(row.storage_path,60*10);
   return {...row,secureUrl:data?.signedUrl??null};
 }));
 const toEdit=canManage;
 const specRows:[string,Item|null][]=[["Veterinarian profile",v],["Professional profile",pr],["Company profile",co]];
 const allLinks=[
  {label:"Directory",href:"/admin/directory",ok:rights.has("directories.manage")},
  {label:"User register",href:"/admin/users",ok:rights.has("users.manage")},
  {label:"Review queue",href:"/admin/reviews",ok:canReview||canRegulatory},
  {label:"Activity report",href:"/admin/reports",ok:rights.has("audit.view")}
 ];
 return <main className="vc-admin-page vc-editor-dossier">
 <SiteHeader/>
 <section className="vc-admin-banner"><div className="shell vc-admin-banner-content"><div>
   <span className="section-kicker">SINGLE SOURCE · ACCOUNT DOSSIER</span><h1>{label}</h1>
   <p>{role.replaceAll("_"," ")} · {accountStatus} · Reference {id.slice(0,8)} · Joined {stamp(p.created_at)}</p>
 </div><div className="vc-admin-actions"><Link className="button button-secondary" href="/admin/users">← User register</Link>{publicHref&&<Link className="button button-primary" target="_blank" rel="noopener noreferrer" href={String(publicHref)}>Open public profile ↗</Link>}</div></div></section>
 <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout">
   <div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
   <div className="admin-control-content vc-admin-main">
   <FormMessage {...notices}/>
   {alertSpam&&<div className="vc-editor-alert" role="alert"><strong>Possible promotional or spam account name.</strong><p>The account name contains a website link or promotional wording. This is not evidence that the link was published as a product or article. Review the account, then suspend it if appropriate. Do not open the untrusted external link.</p></div>}
   <nav className="vc-editor-tabs" aria-label="Record dossier sections">
      <a href="#identity">Submitted details</a><a href="#linked">Linked records</a>
      <a href="#uploads">Files & sources</a><a href="#actions">Management actions</a>
      <a href="#history">History & audit</a>
   </nav>
   <div className="vc-admin-metrics vc-editor-metrics">
     <div className="vc-admin-metric"><span>Account status</span><b>{accountStatus}</b><small>Independent of profile approval</small></div>
     <div className="vc-admin-metric"><span>Veterinarian review</span><b>{String(v?.verification_status??"Not created")}</b><small>Profile verification</small></div>
     <div className="vc-admin-metric"><span>PVMC credential</span><b>{String(v?.pvmc_verification_status??"N/A")}</b><small>Separate evidence check</small></div>
     <div className="vc-admin-metric"><span>Professional review</span><b>{String(pr?.verification_status??"Not created")}</b><small>Independent profile</small></div>
   </div>
   <section className="vc-admin-panel" id="identity">
      <div className="vc-panel-header"><div><span className="section-kicker">ORIGINAL SUBMITTED FIELDS</span><h2>Account registration record</h2><p>Values currently stored in VetConnect, including empty fields. Original form submission data may not be fully preserved.</p></div></div>
      <dl className="vc-editor-field-grid">{noInternal(Object.entries(p)).map(([k,value])=><div key={k}><dt>{k.replaceAll("_"," ")}</dt><dd>{display(value)}</dd></div>)}</dl>
      <div className="vc-editor-note"><strong>Registration source:</strong> VetConnect account profile (exact submitter/IP/source attribution not available in this record). Created {stamp(p.created_at)}. Last profile update {stamp(p.updated_at)}.</div>
   </section>
   <section className="vc-admin-panel" id="linked">
      <div className="vc-panel-header"><div><span className="section-kicker">LINKED WORKFLOWS</span><h2>All stored profile modules</h2><p>Account creation, profile approval, PVMC verification and public publication are different states.</p></div></div>
      {canInspectPrivate? specRows.map(([title,row])=><details key={title} className="vc-editor-record" open={Boolean(row)}>
        <summary>{title} · {row?String(row.verification_status??"Created"):"Not submitted"}</summary>
        {row?<dl className="vc-editor-field-grid">{noInternal(Object.entries(row)).map(([key,val])=><div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{display(val)}</dd></div>)}</dl>:<p>This user has not completed this module.</p>}
      </details>):<p>Specialist details are restricted to authorized verification staff.</p>}
      {canInspectPrivate&&<details className="vc-editor-record"><summary>Education, experience and credentials · {(education.data??[]).length+(experience.data??[]).length+(credentials.data??[]).length} records</summary>
       {([["Education",education.data],["Experience",experience.data],["Credentials",credentials.data]] as [string,Item[]|null][]).map(([title,records])=><div key={title}><h3>{title}</h3>{records?.length?records.map((item,i)=><dl key={String(item.id??i)} className="vc-editor-field-grid">{noInternal(Object.entries(item)).map(([k,value])=><div key={k}><dt>{k.replaceAll("_"," ")}</dt><dd>{display(value)}</dd></div>)}</dl>):<p>No records.</p>}</div>)}
      </details>}
      <div className="vc-editor-note"><strong>Company memberships:</strong> {(memberships.data??[]).length} record(s). {(memberships.data??[]).map(x=><span key={x.company_id}>Company {String(x.company_id).slice(0,8)} · {x.member_role} · {x.membership_status}; </span>)}</div>
      <div className="vc-editor-note"><strong>Public visibility:</strong> {publicHref?<Link href={String(publicHref)} target="_blank" rel="noopener noreferrer">Open published profile in new tab ↗</Link>:"No verified public profile link for this account."} This does not rule out public content created through other organizations.</div>
   </section>
   <section className="vc-admin-panel" id="uploads">
      <div className="vc-panel-header"><div><span className="section-kicker">FILE & SOURCE TRACE</span><h2>Supporting documents and uploads</h2><p>Staff-managed documents are protected. Candidate CV files have separate privacy permissions.</p></div></div>
      {canManage ? <>
        {uploads.error?<p role="alert">Staff documents could not be read.</p>:
        docLinks.length?<div className="vc-editor-file-list">{docLinks.map(doc=><div key={doc.id}>
          <strong>{doc.original_name}</strong><span>{doc.document_kind} · {doc.entity_type} · uploaded {stamp(doc.created_at)}</span>
          <span>Recorded uploader: {doc.created_by||"Unknown"}</span>
          {doc.secureUrl?<a href={doc.secureUrl} target="_blank" rel="noopener noreferrer">Open authorized file in new tab ↗</a>:<small>File access not granted or link unavailable</small>}
        </div>)}</div>:<p>No staff-uploaded supporting files are linked to this account.</p>}
        <p>Career / CV document metadata: {(careerFiles.data??[]).length} visible record(s). CV download requires its separate employer/owner authorization and is not enabled from this administrative account page.</p>
      </>:<p>Document origins are available only to authorized account-management staff.</p>}
   </section>
   <section className="vc-admin-panel" id="actions">
     <div className="vc-panel-header"><div><span className="section-kicker">MANAGEMENT CONTROL</span><h2>Review, correct and restrict this record</h2><p>Actions are checked again on the server. No action on this page automatically verifies a PVMC number.</p></div></div>
     {toEdit&&<details className="vc-editor-action" open><summary>Edit identity & contact details</summary>
       <form action={correctUserDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/>
         {(["full_name","phone","province","district","tehsil","city"] as const).map(field=><div key={field}>
           <label htmlFor={`edit-${field}`}>{field.replaceAll("_"," ")}</label>
           <input id={`edit-${field}`} name={field} defaultValue={String(p[field]??"")} maxLength={field==="full_name"?120:100} required={field==="full_name"}/>
         </div>)}
         <p className="vc-editor-form-foot">Email, user ID and primary role are not editable here. Use identity-controlled workflows for those fields.</p>
         <FormSubmitButton className="button button-primary" pendingLabel="Saving correction…">Save account correction</FormSubmitButton>
       </form>
     </details>}
     {isSuperAdmin&&canReview&&v&&<details className="vc-editor-action"><summary>Edit veterinarian non-credential fields</summary><form action={correctSpecialistDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="profile_kind" value="veterinarian"/>
       {(["qualifications","veterinary_sector","specialization"] as const).map(field=><div key={field}><label htmlFor={`vet-${field}`}>{field.replaceAll("_"," ")}</label><input id={`vet-${field}`} name={field} defaultValue={String(v[field]??"")} maxLength={500}/></div>)}
       <p className="vc-editor-form-foot">PVMC number, approval and credential status require the independent review controls.</p>
       <FormSubmitButton className="button button-primary" pendingLabel="Saving…">Save veterinarian corrections</FormSubmitButton>
     </form></details>}
     {isSuperAdmin&&canReview&&pr&&<details className="vc-editor-action"><summary>Edit professional profile fields</summary><form action={correctSpecialistDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="profile_kind" value="professional"/>
       {(["professional_type","headline","organization_name"] as const).map(field=><div key={field}><label htmlFor={`pro-${field}`}>{field.replaceAll("_"," ")}</label><input id={`pro-${field}`} name={field} defaultValue={String(pr[field]??"")} maxLength={500}/></div>)}
       <FormSubmitButton className="button button-primary" pendingLabel="Saving…">Save professional corrections</FormSubmitButton>
     </form></details>}
     {canReview&&accountStatus==="active"&&specRows.map(([title,row])=>{
       const type=title==="Veterinarian profile"?"veterinarian":title==="Professional profile"?"professional":"company";
       return row&&row.verification_status!=="approved"?<div key={type} className="vc-editor-action"><h3>{title}: {String(row.verification_status)}</h3>
          <form className="vc-editor-decision" action={reviewProfileAction}>
            <input type="hidden" name="profile_type" value={type}/><input type="hidden" name="record_source" value="account"/>
            <input type="hidden" name="user_id" value={id}/><input type="hidden" name="entity_id" value={id}/>
            <input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
            <label htmlFor={`profile-reason-${type}`}>Reviewer note / rejection reason</label>
            <input id={`profile-reason-${type}`} name="reason" placeholder="Document the reason and your verification evidence"/>
            <div className="vc-editor-buttons"><FormSubmitButton className="button button-primary" name="decision" value="approved" pendingLabel="Saving approval…">Approve profile</FormSubmitButton>
              <button className="button button-secondary" type="submit" name="decision" value="rejected">Reject / return</button></div>
          </form>
       </div>:null;
     })}
     {canRegulatory&&accountStatus==="active"&&v&&v.verification_status==="approved"&&v.pvmc_verification_status==="pending"&&<div className="vc-editor-action">
        <h3>Independent PVMC credential review</h3><p>Record verified evidence before approving; the typed PVMC number is not sufficient.</p>
        <form action={reviewVeterinarianCredentialAction} className="vc-editor-decision"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="record_source" value="account"/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
          <label htmlFor="pvmc-reason">Evidence source / reviewer decision</label><input id="pvmc-reason" name="reason" placeholder="PVMC verification source and decision note"/>
          <div className="vc-editor-buttons"><FormSubmitButton className="button button-primary" name="decision" value="approved" pendingLabel="Saving decision…">Verify credential</FormSubmitButton><button className="button button-secondary" type="submit" name="decision" value="rejected">Reject credential</button></div>
        </form>
     </div>}
     {canManage&&<div className="vc-editor-action"><h3>Account access</h3><p>Suspension blocks VetConnect account use. It does not delete data or change previous audit entries.</p>
        {accountStatus==="active"?<form action={updateUserStatusAction} className="vc-editor-decision">
          <input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/><input type="hidden" name="account_status" value="suspended"/>
          <label htmlFor="suspend-confirm">Type SUSPEND to confirm</label><input id="suspend-confirm" name="confirmation" placeholder="SUSPEND" required autoComplete="off"/>
          <FormSubmitButton className="button button-secondary" pendingLabel="Suspending…">Suspend account</FormSubmitButton>
        </form>:<form action={updateUserStatusAction}><input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/><input type="hidden" name="account_status" value="active"/>
          <FormSubmitButton className="button button-secondary" pendingLabel="Restoring…">Restore account access</FormSubmitButton></form>}
     </div>}
     {canManage&&<details className="vc-editor-action"><summary>Staff role upgrades / downgrades</summary><form action={updateStaffRolesAction} className="vc-editor-decision"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
        <fieldset><legend>Staff assignments</legend>{staffRoleOptions.map(role=><label className="checkbox-line" key={role.value}>
          <input type="checkbox" name="staff_roles" value={role.value} defaultChecked={roles.includes(role.value)}/>{role.label}</label>)}</fieldset>
        <FormSubmitButton className="button button-primary" pendingLabel="Updating roles…">Save staff roles</FormSubmitButton>
     </form></details>}
     {canManage&&<details className="vc-editor-action"><summary>Individual permission overrides</summary><form className="vc-editor-decision" action={updateUserPermissionsAction}><input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
       <p>Explicit denials override staff-role grants. Leave both boxes empty to inherit the role.</p>
       <div className="vc-editor-permissions">{permissionOptions.map(option=><div key={option.value}><strong>{option.label}</strong><small>{option.summary}</small>
         <label><input type="checkbox" name="granted_permissions" value={option.value} defaultChecked={granted.has(option.value)}/> Grant</label>
         <label><input type="checkbox" name="revoked_permissions" value={option.value} defaultChecked={revoked.has(option.value)}/> Revoke</label>
       </div>)}</div><FormSubmitButton className="button button-primary" pendingLabel="Updating permissions…">Save permission overrides</FormSubmitButton>
     </form></details>}
     {!canManage&&!canReview&&!canRegulatory&&<p>You have directory viewing permissions but no mutation rights.</p>}
   </section>
   <section className="vc-admin-panel" id="history"><div className="vc-panel-header"><div><span className="section-kicker">ACCOUNTABILITY</span><h2>Review history & audit trail</h2>
     <p>Records are displayed only where previously logged. An empty log does not prove that no changes occurred.</p></div></div>
     {canManage?(audit.error?<p role="alert">Audit history could not be read.</p>:(audit.data??[]).length?<div className="vc-editor-audit">{(audit.data??[]).map(log=><article key={log.id}>
       <strong>{log.action}</strong><span>{stamp(log.created_at)} · {log.entity_type}</span><span>Actor: {log.actor_id||"System or unknown"}</span>
       {log.metadata&&<details><summary>Audit details</summary><pre>{JSON.stringify(log.metadata,null,2)}</pre></details>}
     </article>)}</div>:<p>No audit entries were found for this account or its recorded actions.</p>):<p>Audit history requires account-management permission.</p>}
     {canRegulatory&&<div className="vc-editor-audit">{(verification.data??[]).map(row=><article key={row.id}><strong>{row.verification_type}: {row.status}</strong>
       <span>Reviewed: {stamp(row.reviewed_at)} · Reviewer: {row.reviewed_by||"Not recorded"}</span></article>)}</div>}
   </section>
   <nav className="vc-customer-shortcuts" aria-label="Related management views">{allLinks.filter(x=>x.ok).map(x=><Link key={x.label} href={x.href}>{x.label}</Link>)}</nav>
   </div>
 </div></section><SiteFooter/>
 </main>;
}
