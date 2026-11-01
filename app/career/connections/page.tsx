import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import WorkspaceNavigation from '@/app/components/WorkspaceNavigation';
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
 return <main><SiteHeader/><WorkspaceNavigation approved={approved}/><section className="section"><div className="shell profile-home-shell backend-form-card"><span className="section-kicker">MY ORGANIZATION CONNECTIONS</span><h1>Your roles, one personal profile</h1><p>Companies and clinics retain their own identities. Your owner, staff or consultant relationship can change without replacing your personal profile.</p>
 {(companies.error||clinics.error||access.error||names.error||clinicNames.error)&&<p role="alert">Some connections could not be loaded. This does not mean a relationship has been removed.</p>}
 <h2>Companies</h2>{(companies.data??[]).length===0?<p>No company membership is recorded for this account.</p>:<ul className="connection-records">{companies.data?.map(row=><li key={row.company_id}><b>{names.data?.find(n=>n.id===row.company_id)?.canonical_name||'Company record'}</b><span>{[row.member_role,row.designation,row.relationship_type].filter(Boolean).join(' · ')}</span><span>Relationship: {row.membership_status} · Review: {row.verification_status}</span></li>)}</ul>}
 {approved&&Array.isArray(access.data)&&access.data.length>0&&<Link className="button button-secondary" href="/dashboard/company">Open my authorized company workspace</Link>}
 <h2>Clinics</h2>{(clinics.data??[]).length===0?<p>No clinic affiliation is recorded for this account.</p>:<ul className="connection-records">{clinics.data?.map(row=><li key={row.clinic_id}><b>{clinicNames.data?.find(n=>n.id===row.clinic_id)?.clinic_name||'Clinic record'}</b><span>{row.designation||'Role not specified'} · {row.membership_status}</span></li>)}</ul>}
 {approved&&identity.roles.some(role=>['veterinarian','professional'].includes(role))&&<Link className="button button-secondary" href="/dashboard/clinics">Manage clinic affiliations</Link>}
 <p>Pending, inactive and ended connections remain labelled as recorded. Entering an employer in your CV does not grant access to its company account.</p><Link href="/career">Back to my profile</Link>
 </div></section><SiteFooter/></main>;
}
