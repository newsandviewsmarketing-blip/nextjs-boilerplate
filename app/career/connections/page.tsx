import Link from 'next/link';
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {requireCareerAccount} from '@/lib/career-access';

type CompanyMembership={
 company_id:string;member_role:string;designation:string|null;
 relationship_type:string|null;membership_status:string;verification_status:string;
};
type ClinicMembership={
 clinic_id:string;designation:string|null;membership_status:string;
};
type OwnedClinic={
 id:string;slug:string;clinic_name:string;facility_type:string;
 city:string|null;verification_status:string;is_published:boolean;
};
export default async function Connections(){
 const {identity,supabase}=await requireCareerAccount();
 const canManageClinics=identity.roles.some(role=>['veterinarian','professional'].includes(role));
 const [companies,clinics,owned,access,profile]=await Promise.all([
  supabase.from('company_members').select('company_id,member_role,designation,relationship_type,membership_status,verification_status').eq('user_id',identity.userId),
  supabase.from('clinic_members').select('clinic_id,designation,membership_status').eq('professional_user_id',identity.userId),
  supabase.from('clinics').select('id,slug,clinic_name,facility_type,city,verification_status,is_published').eq('owner_id',identity.userId),
  supabase.rpc('get_my_company_workspaces'),
  supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle(),
 ]);
 const companyMemberships=(companies.data??[]) as CompanyMembership[];
 const clinicMemberships=(clinics.data??[]) as ClinicMembership[];
 const ownedClinics=(owned.data??[]) as OwnedClinic[];
 const ownedIds=new Set(ownedClinics.map(item=>item.id));
 const companyIds=[...new Set(companyMemberships.map(row=>row.company_id))];
 const linkedClinicIds=[...new Set(clinicMemberships.map(row=>row.clinic_id).filter(id=>!ownedIds.has(id)))];
 const [names,clinicNames]=await Promise.all([
  companyIds.length?supabase.from('companies').select('id,canonical_name').in('id',companyIds):Promise.resolve({data:[],error:null}),
  linkedClinicIds.length?supabase.from('clinics').select('id,clinic_name,slug').in('id',linkedClinicIds):Promise.resolve({data:[],error:null}),
 ]);
 const approved=profile.data?.verification_status==='approved';
 const hasCompanyAccess=Array.isArray(access.data)&&access.data.length>0;
 const hasErrors=Boolean(companies.error||clinics.error||owned.error||access.error||names.error||clinicNames.error);
 return <CareerWorkspaceFrame
  active="connections"
  name={identity.profile?.full_name||identity.email}
  verificationStatus={profile.data?.verification_status}
  approved={approved}
  title="Your professional connections."
  description="Own a clinic, join a team or manage company roles from one personal profile. Each organization keeps its separate identity.">
  <section className="backend-form-card vcx-embedded-card">
   <span className="vcx-eyebrow">ONE PERSON, MULTIPLE ROLES</span>
   <h2>What would you like to connect?</h2>
   <p>Choose one path. Your CV, contact information and qualifications stay with your personal account. A facility or company is a separate record.</p>
   {hasErrors&&<p role="alert" className="form-message form-message-error">Some connections are temporarily unavailable. Existing records have not been changed. Please retry before adding a new facility.</p>}
   <div className="vcx-connection-actions">
    <article className="vcx-connection-choice">
     <span className="vcx-eyebrow">MY FACILITY</span>
     <h3>My clinic or hospital</h3>
     <p>Manage an existing facility or create its own profile, services, team and opening hours.</p>
     {canManageClinics?<Link className="vcx-button vcx-button-primary" href="/dashboard/clinics#new-clinic">Create or manage clinic</Link>
      :<span className="vcx-connection-hint">Available to eligible veterinary and professional accounts.</span>}
    </article>
    <article className="vcx-connection-choice">
     <span className="vcx-eyebrow">OTHER CLINICS</span>
     <h3>I work with a clinic</h3>
     <p>Find an existing clinic and request an affiliation. Its owner must confirm your role.</p>
     {canManageClinics?<Link className="vcx-button vcx-button-outline" href="/clinics">Find existing clinic</Link>
      :<span className="vcx-connection-hint">Clinic affiliation is available to eligible professionals.</span>}
    </article>
    <article className="vcx-connection-choice">
     <span className="vcx-eyebrow">COMPANIES</span>
     <h3>My company connections</h3>
     <p>Keep ownership, employment, consultancy and organizational access separate from your CV.</p>
     {hasCompanyAccess&&approved?<Link className="vcx-button vcx-button-outline" href="/dashboard/company">Open authorized company</Link>
      :<span className="vcx-connection-hint">Existing memberships are shown below. Additional company access requires an authorized membership.</span>}
    </article>
   </div>
   <section className="vcx-connection-group" aria-labelledby="owned-clinics-title">
    <h2 id="owned-clinics-title">Clinics I own</h2>
    {ownedClinics.length===0?<p className="vcx-secondary">No owned clinic is linked to this account yet.</p>:
     <ul className="connection-records">{ownedClinics.map(clinic=><li key={clinic.id}>
      <b>{clinic.clinic_name}</b>
      <span>{clinic.facility_type} · {clinic.city||'Location not set'} · Owner record</span>
      <span>Facility review: {clinic.verification_status} · {clinic.is_published?'Published':'Unpublished'}</span>
      {canManageClinics&&<Link href={'/dashboard/clinics/'+clinic.id}>Manage this clinic</Link>}
     </li>)}</ul>}
   </section>
   <section className="vcx-connection-group" aria-labelledby="clinic-affiliations-title">
    <h2 id="clinic-affiliations-title">My clinic affiliations</h2>
    {clinicMemberships.length===0?<p className="vcx-secondary">No clinic invitations or affiliations recorded.</p>:
     <ul className="connection-records">{clinicMemberships.map(row=>{
      const ownedClinic=ownedClinics.find(item=>item.id===row.clinic_id);
      const linked=clinicNames.data?.find(item=>item.id===row.clinic_id);
      const name=ownedClinic?.clinic_name||linked?.clinic_name||'Clinic affiliation (name restricted)';
      return <li key={row.clinic_id}>
       <b>{name}</b>
       <span>{row.designation||'Designation not specified'} · {row.membership_status}</span>
       <span>{ownedIds.has(row.clinic_id)?'Also recorded as an owned facility':'Professional affiliation, not ownership'}</span>
       {canManageClinics&&<Link href="/dashboard/clinics">Review invitations and visibility</Link>}
      </li>;
     })}</ul>}
   </section>
   <section className="vcx-connection-group" aria-labelledby="company-links-title">
    <h2 id="company-links-title">My company relationships</h2>
    {companyMemberships.length===0?<p className="vcx-secondary">No company membership is recorded for this account.</p>:
     <ul className="connection-records">{companyMemberships.map(row=><li key={row.company_id}>
      <b>{names.data?.find(item=>item.id===row.company_id)?.canonical_name||'Company record'}</b>
      <span>{[row.member_role,row.designation,row.relationship_type].filter(Boolean).join(' · ')}</span>
      <span>Relationship: {row.membership_status} · Review: {row.verification_status}</span>
     </li>)}</ul>}
    {hasCompanyAccess&&approved&&<Link className="vcx-button vcx-button-outline" href="/dashboard/company">Open authorized company workspace</Link>}
   </section>
   <p className="vcx-secondary">Creating a clinic does not automatically publish it or verify veterinary credentials. Employment mentioned in your CV does not provide access to a clinic or company. Pending, inactive and ended connections remain labelled as recorded.</p>
   <Link href="/career">Back to my workspace</Link>
  </section>
 </CareerWorkspaceFrame>;
}
