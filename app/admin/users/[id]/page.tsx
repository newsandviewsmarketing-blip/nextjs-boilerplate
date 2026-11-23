import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import ProfilePhoto from "../../../components/ProfilePhoto";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import AdminNav from "../../components/AdminNav";
import DossierSectionTabs from "./DossierSectionTabs";
import "./dossier-polish.css";
import ReviewDocumentsPanel from "../../reviews/ReviewDocumentsPanel";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermissions,permissionOptions,staffRoleOptions} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {isSuspiciousProfileName} from "@/lib/profile-name";
import {credentialDataFlags} from "@/lib/veterinary-verification";
import {correctUserDossierAction,correctSpecialistDossierAction} from "./actions";
import {updateUserStatusAction,updateStaffRolesAction,updateUserPermissionsAction} from "../actions";
import {reviewProfileAction,reviewVeterinarianCredentialAction,reopenVeterinaryCredentialAction} from "../../actions";

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
// Render curated professional information, not raw database columns or internal identifiers.
const fields=(row:Item|null,keys:readonly string[])=>keys
 .filter(key=>row&&row[key]!==null&&row[key]!==undefined&&row[key]!==""&&(!Array.isArray(row[key])||(row[key] as unknown[]).length>0))
 .map(key=>[key,row?.[key]] as [string,unknown]);
const fieldNames:Record<string,string>={
 qualifications:"Qualifications",veterinary_sector:"Veterinary sector",specialization:"Specialization",
 years_experience:"Experience (years)",services:"Services",professional_type:"Professional type",
 headline:"Professional headline",current_position:"Current position",organization_name:"Organization",
 skills:"Professional skills",public_summary:"Biography",business_name:"Business name",
 organization_type:"Organization type",district:"District",tehsil:"Tehsil",
 degree:"Degree",institution:"Institution",field_of_study:"Field of study",
 designation:"Designation",responsibilities:"Responsibilities",
 credential_type:"Credential",issuing_authority:"Issuing authority",
 category:"Category",subcategory:"Subcategory",registration_intent:"Registration purpose"
};
const labelFor=(key:string)=>fieldNames[key]??key.replaceAll("_"," ");
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
 const canInspectEvidence=canManage||canReview;
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
 const vetCredentialIssues=v?credentialDataFlags(v as {qualifications?:string|null;pvmc_number?:string|null;pvmc_verification_status?:string|null}):[];
 const label=isSuspiciousProfileName(String(p.full_name??"")) ? `Flagged account · ${id.slice(0,8)}` : safeName(p.full_name||p.email||"Unnamed account");
 const photoUrl=typeof pr?.image_url==="string"&&pr.image_url.trim()?pr.image_url.trim():
   typeof v?.image_url==="string"&&v.image_url.trim()?v.image_url.trim():null;
 const overviewFacts:[string,unknown][]=[
   ["Email",p.email],["Phone",p.phone],
   ["Sector",v?.veterinary_sector],["Specialization",v?.specialization],
   ["Experience",v?.years_experience??pr?.years_experience],
   ["Current position",pr?.current_position],["Organization",pr?.organization_name],
 ].filter(([,value])=>value!==null&&value!==undefined&&value!=="");
 const vetFields=["qualifications","veterinary_sector","specialization","years_experience","services"];
 const professionalFields=["current_position","organization_name","skills"];
 const companyFields=["business_name","organization_type","public_summary"];
 const renderedVet=fields(v,vetFields.filter(key=>!["veterinary_sector","specialization","years_experience"].includes(key)));
 const renderedProfessional=fields(pr,professionalFields.filter(key=>!["current_position","organization_name"].includes(key)));
 const renderedCompany=fields(co,companyFields);
 const alertSpam=isSuspiciousProfileName(String(p.full_name??""));
 const {data:registrationEvidence,error:registrationEvidenceError}=canInspectEvidence
   ? await supabase.from("registration_evidence")
       .select("user_id,document_type,original_filename,storage_path,verification_status")
       .eq("user_id",id).order("created_at",{ascending:false}).limit(60)
   : {data:[],error:null};
 const evidenceLinks=await Promise.all((registrationEvidence??[]).map(async row=>{
   const {data}=await supabase.storage.from("registration-evidence").createSignedUrl(row.storage_path,60*10);
   return {...row,secureUrl:data?.signedUrl??null};
 }));
 const docLinks=await Promise.all((uploads.data??[]).map(async row=>{
   const {data}=await supabase.storage.from("record-documents").createSignedUrl(row.storage_path,60*10);
   return {...row,secureUrl:data?.signedUrl??null};
 }));
 const toEdit=canManage;
 const specRows:[string,Item|null][]=[["Veterinarian profile",v],["Professional profile",pr],["Company profile",co]];
 return <main className="vc-admin-page vc-editor-dossier" data-dossier-tab="overview">
 <section className="vc-admin-banner"><div className="shell vc-admin-banner-content">
  <div className="vc-dossier-identity">
   <div className="vc-dossier-photo" aria-label="Existing professional photograph">
    <ProfilePhoto imageUrl={photoUrl} name={label} fallback={label.slice(0,1).toUpperCase()}/>
   </div>
   <div><span className="section-kicker">VETCONNECT · PROFESSIONAL RECORD</span>
    <h1>{label}</h1>
    <p>{String(pr?.headline||pr?.professional_type||role).replaceAll("_"," ")} · {[p.city,p.province].filter(Boolean).join(", ")||"Location not supplied"}</p>
   </div>
  </div>
  <div className="vc-admin-actions"><Link className="button button-secondary" href="/admin/users">← User register</Link></div>
 </div></section>
 <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout">
   <div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
   <div className="admin-control-content vc-admin-main">
   <FormMessage {...notices}/>
   {vetCredentialIssues.length>0 && <div className="vc-editor-alert" role="alert"><strong>PVMC status requires re-verification.</strong>
     <p>Previously marked approved, but the stored record is inconsistent: {vetCredentialIssues.join("; ")}. The verification status is not sufficient evidence of a valid practising licence. Review the original documentation and official PVMC register before displaying this account as credential-verified.</p>
     {canRegulatory&&<Link href="/admin/credential-recheck">Open PVMC data recheck register ↗</Link>}
    </div>}
   {alertSpam&&<div className="vc-editor-alert" role="alert"><strong>Possible promotional or spam account name.</strong><p>The account name contains a website link or promotional wording. This is not evidence that the link was published as a product or article. Review the account, then suspend it if appropriate. Do not open the untrusted external link.</p></div>}
   <DossierSectionTabs/>
   <div className="vc-admin-metrics vc-editor-metrics">
     <div className="vc-admin-metric"><span>Account status</span><b>{accountStatus}</b><small>Independent of profile approval</small></div>
     <div className="vc-admin-metric"><span>Veterinarian review</span><b>{String(v?.verification_status??"Not created")}</b><small>Profile verification</small></div>
     <div className="vc-admin-metric"><span>PVMC credential</span><b>{vetCredentialIssues.length>0?"RECHECK REQUIRED":String(v?.pvmc_verification_status??"N/A")}</b><small>Separate evidence check</small></div>
     <div className="vc-admin-metric"><span>Professional review</span><b>{String(pr?.verification_status??"Not created")}</b><small>Independent profile</small></div>
   </div>
   <section className="vc-admin-panel" id="identity">
    <div className="vc-panel-header"><div><span className="section-kicker">OVERVIEW</span><h2>Applicant overview</h2><p>Current relevant profile information, shown once for easy review.</p></div></div>
    <dl className="vc-editor-field-grid">
     {overviewFacts.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{name==="Experience"?String(value)+" years":display(value)}</dd></div>)}
    </dl>
    {typeof pr?.public_summary==="string"&&pr.public_summary.trim()&&<div className="vc-dossier-biography"><h3>Professional biography</h3><p>{String(pr.public_summary)}</p></div>}
   </section>
   <section className="vc-admin-panel" id="linked">
    <div className="vc-panel-header"><div><span className="section-kicker">ORIGINAL SUBMISSION</span><h2>Professional and registration details</h2><p>Additional submitted fields only. Identifiers, internal keys, approval flags and duplicated contact information are not shown here.</p></div></div>
    {canInspectPrivate&&<details className="vc-editor-record"><summary>Registration details</summary>
      {fields(p,["district","tehsil","registration_intent"]).filter(([key,value])=>key!=="tehsil"||value!==p.city).length?
      <dl className="vc-editor-field-grid">{fields(p,["district","tehsil","registration_intent"]).filter(([key,value])=>key!=="tehsil"||value!==p.city).map(([key,value])=><div key={key}><dt>{labelFor(key)}</dt><dd>{display(value)}</dd></div>)}</dl>:
      <p>No additional registration information to display.</p>}
    </details>}
    {canInspectPrivate&&[
      {title:"Veterinarian",row:v,items:renderedVet},
      {title:"Professional",row:pr,items:renderedProfessional},
      {title:"Company",row:co,items:renderedCompany}
     ].filter(section=>section.row&&section.items.length>0).map(section=>
       <details key={section.title} className="vc-editor-record"><summary>{section.title} information</summary>
        <dl className="vc-editor-field-grid">{section.items.map(([key,value])=><div key={key}><dt>{labelFor(key)}</dt><dd>{display(value)}</dd></div>)}</dl>
       </details>)}
    {canInspectPrivate&&((education.data??[]).length+(experience.data??[]).length+(credentials.data??[]).length)>0&&
     <details className="vc-editor-record"><summary>Education, experience and professional credentials</summary>
      {([["Education",education.data,["degree","institution","field_of_study"]],
         ["Experience",experience.data,["designation","organization_name","responsibilities"]],
         ["Credentials",credentials.data,["credential_type","issuing_authority"]]] as [string,Item[]|null,string[]][]).map(([title,records,keys])=>
       records?.length?<div key={title}><h3>{title}</h3>{records.map((item,i)=><dl key={String(item.id??i)} className="vc-editor-field-grid">
        {fields(item,keys).map(([key,value])=><div key={key}><dt>{labelFor(key)}</dt><dd>{display(value)}</dd></div>)}
       </dl>)}</div>:null)}
     </details>}
    {canInspectPrivate&&(memberships.data??[]).length>0&&<details className="vc-editor-record"><summary>Organization affiliations</summary><dl className="vc-editor-field-grid">{(memberships.data??[]).map((membership,i)=><div key={i}><dt>Affiliation {i+1}</dt><dd>{String(membership.member_role).replaceAll("_"," ")} · {String(membership.membership_status).replaceAll("_"," ")}</dd></div>)}</dl></details>}
    {!canInspectPrivate&&<p>Professional submissions require authorized review permission.</p>}
   </section>
   <section className="vc-admin-panel" id="uploads">
      <div className="vc-panel-header"><div><span className="section-kicker">FILE & SOURCE TRACE</span><h2>2. Documents · Supporting uploads</h2><p>Documents are listed from separately permissioned sources. Missing links do not establish that no file exists.</p></div></div>
      {canInspectEvidence && <>
        {registrationEvidenceError?<p role="alert">Private registration documents could not be read.</p>:
         <ReviewDocumentsPanel veterinarian={Boolean(v)} documents={evidenceLinks.map((doc,i)=>({
           key:doc.storage_path+"-"+i,kind:doc.document_type,filename:doc.original_filename,
           status:doc.verification_status,url:doc.secureUrl
         }))}/>}
      </>}
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
     {toEdit&&<details className="vc-editor-action" name="dossier-actions"><summary>Edit identity & contact details</summary>
       <form action={correctUserDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/>
         {(["full_name","phone","province","district","tehsil","city"] as const).map(field=><div key={field}>
           <label htmlFor={`edit-${field}`}>{field.replaceAll("_"," ")}</label>
           <input id={`edit-${field}`} name={field} defaultValue={String(p[field]??"")} maxLength={field==="full_name"?120:100} required={field==="full_name"}/>
         </div>)}
         <p className="vc-editor-form-foot">Email, user ID and primary role are not editable here. Use identity-controlled workflows for those fields.</p>
         <FormSubmitButton className="button button-primary" pendingLabel="Saving correction…">Save account correction</FormSubmitButton>
       </form>
     </details>}
     {isSuperAdmin&&canReview&&v&&<details className="vc-editor-action" name="dossier-actions"><summary>Edit veterinarian non-credential fields</summary><form action={correctSpecialistDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="profile_kind" value="veterinarian"/>
       {(["qualifications","veterinary_sector","specialization"] as const).map(field=><div key={field}><label htmlFor={`vet-${field}`}>{field.replaceAll("_"," ")}</label><input id={`vet-${field}`} name={field} defaultValue={String(v[field]??"")} maxLength={500}/></div>)}
       <p className="vc-editor-form-foot">PVMC number, approval and credential status require the independent review controls.</p>
       <FormSubmitButton className="button button-primary" pendingLabel="Saving…">Save veterinarian corrections</FormSubmitButton>
     </form></details>}
     {isSuperAdmin&&canReview&&pr&&<details className="vc-editor-action" name="dossier-actions"><summary>Edit professional profile fields</summary><form action={correctSpecialistDossierAction} className="vc-editor-form"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="profile_kind" value="professional"/>
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
     {isSuperAdmin&&canRegulatory&&v?.pvmc_verification_status==="approved"&&vetCredentialIssues.length>0&&<div className="vc-editor-action">
       <h3>Reopen PVMC credential for verification</h3>
       <p>The stored PVMC-approval flag does not match required evidence. Reopening the credential returns its status to pending; it does not suspend or accuse the account holder. Record the follow-up reason.</p>
       <form className="vc-editor-decision" action={reopenVeterinaryCredentialAction}>
         <input type="hidden" name="user_id" value={id}/>
         <label htmlFor="reopen-pvmc-note">Verification gap and requested documents</label>
         <textarea id="reopen-pvmc-note" name="reason" minLength={25} maxLength={1500} required placeholder="Example: Original DVM transcript, registration number and active PVMC registry entry required to resolve approved status without evidence."/>
         <FormSubmitButton className="button button-secondary" pendingLabel="Reopening review…">Reopen PVMC verification</FormSubmitButton>
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
     {canManage&&<details className="vc-editor-action" name="dossier-actions"><summary>Staff role upgrades / downgrades</summary><form action={updateStaffRolesAction} className="vc-editor-decision"><input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
        <fieldset><legend>Staff assignments</legend>{staffRoleOptions.map(role=><label className="checkbox-line" key={role.value}>
          <input type="checkbox" name="staff_roles" value={role.value} defaultChecked={roles.includes(role.value)}/>{role.label}</label>)}</fieldset>
        <FormSubmitButton className="button button-primary" pendingLabel="Updating roles…">Save staff roles</FormSubmitButton>
     </form></details>}
     {canManage&&<details className="vc-editor-action" name="dossier-actions"><summary>Individual permission overrides</summary><form className="vc-editor-decision" action={updateUserPermissionsAction}><input type="hidden" name="user_id" value={id}/><input type="hidden" name="return_to" value={`/admin/users/${id}`}/>
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
       <strong>{log.action.replaceAll("_"," ").replaceAll("."," · ")}</strong><span>{stamp(log.created_at)} · {log.entity_type.replaceAll("_"," ")}</span>
     </article>)}</div>:<p>No audit entries were found for this account or its recorded actions.</p>):<p>Audit history requires account-management permission.</p>}
     {canRegulatory&&<div className="vc-editor-audit">{(verification.data??[]).map(row=><article key={row.id}><strong>{row.verification_type}: {row.status}</strong>
       <span>Reviewed: {stamp(row.reviewed_at)}</span></article>)}</div>}
   </section>
   </div>
 </div></section>
 </main>;
}
