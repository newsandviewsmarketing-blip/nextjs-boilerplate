import Link from 'next/link';
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {requireCareerAccount} from '@/lib/career-access';
export default async function Connections(){
 const {identity,supabase}=await requireCareerAccount();
 const [companies,clinics,access,profile]=await Promise.all([
  supabase.from('company_members').select('company_id,member_role,designation,relationship_type,membership_status,verification_status').eq('user_id',identity.userId),
  supabase.from('clinic_members').select('clinic_id,designation,membership_status').eq('professional_user_id',identity.userId),
  supabase.rpc('get_my_company_workspaces'),
  supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle(),
 ]);
 const companyIds=[...new Set((companies.data??[]).map(row=>row.company_id))],clinicIds=[...new Set((clinics.data??[]).map(row=>row.clinic_id))];
 const [names,clinicNames]=await Promise.all([
 companyIds.length?supabase.from('companies').select('id,canonical_name').in('id',companyIds):Promise.resolve({data:[],error:null}),
 clinicIds.length?supabase.from('clinics').select('id,clinic_name').in('id',clinicIds):Promise.resolve({data:[],error:null}),
 ]);
 const approved=profile.data?.verification_status==='approved';
 return <CareerWorkspaceFrame active="connections" name={identity.profile?.full_name||identity.email} verificationStatus={profile.data?.verification_status} approved={approved} title="Your professional connections." description="See verified roles in companies and clinics while keeping your personal profile separate."><section className="backend-form-card vcx-embedded-card">
   <span className="vcx-eyebrow">MY ORGANIZATION CONNECTIONS</span>
   <h2>Your roles, one personal profile</h2>
   <p>Company and clinic identities stay separate. Employment text alone does not grant access to an organization.</p>
   {(companies.error||clinics.error||access.error||names.error||clinicNames.error)&&<p role="alert">Some connections could not be loaded. This does not mean a relationship has been removed.</p>}
 <h2>Companies</h2>{(companies.data??[]).length===0?<p>No company membership is recorded for this account.</p>:<ul className="connection-records">{companies.data?.map(row=><li key={row.company_id}><b>{names.data?.find(n=>n.id===row.company_id)?.canonical_name||'Company record'}</b><span>{[row.member_role,row.designation,row.relationship_type].filter(Boolean).join(' · ')}</span><span>Relationship: {row.membership_status} · Review: {row.verification_status}</span></li>)}</ul>}
 {approved&&Array.isArray(access.data)&&access.data.length>0&&<Link className="button button-secondary" href="/dashboard/company">Open my authorized company workspace</Link>}
 <h2>Clinics</h2>{(clinics.data??[]).length===0?<p>No clinic affiliation is recorded for this account.</p>:<ul className="connection-records">{clinics.data?.map(row=><li key={row.clinic_id}><b>{clinicNames.data?.find(n=>n.id===row.clinic_id)?.clinic_name||'Clinic record'}</b><span>{row.designation||'Role not specified'} · {row.membership_status}</span></li>)}</ul>}
 {approved&&identity.roles.some(role=>['veterinarian','professional'].includes(role))&&<Link className="button button-secondary" href="/dashboard/clinics">Manage clinic affiliations</Link>}
 <p>Pending, inactive and ended connections remain labelled as recorded. Entering an employer in your CV does not grant access to its company account.</p><Link href="/career">Back to my profile</Link>
 </section></CareerWorkspaceFrame>;
}
