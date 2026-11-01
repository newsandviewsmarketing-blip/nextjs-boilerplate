import type {ReactNode} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProfilePhoto from '@/app/components/ProfilePhoto';
import {getCoreProfileProgress} from '@/lib/professional-progress';
import {getCurrentIdentity} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {WORKSPACE_LINKS} from '@/lib/professional-workspace';
import './CareerWorkspaceFrame.css';

type WorkspaceId=(typeof WORKSPACE_LINKS)[number]['id'];
type Check={label:string;done:boolean;optional?:boolean};
type Props={
 active:WorkspaceId;
 module?:'career'|'account'|'clinic'|'company';
 name:string;
 headline?:string|null;
 location?:string|null;
 photoUrl?:string|null;
 approved?:boolean;
 verificationStatus?:string|null;
 cvStatus?:'saved'|'draft'|'missing';
 emailAlerts?:boolean;
 checklist?:Check[];
 title:string;
 description:string;
 children:ReactNode;
};

const SYMBOLS:Record<WorkspaceId,string>={
 overview:'▦',account:'⚙',profile:'◉',cv:'▤',preferences:'⌖',
 letter:'✉',connections:'◇',clinic:'✚',company:'▣',applications:'☷',
};
function profileReview(status?:string|null, practitioner=false){
 if(!practitioner)return 'Professional profile · self-managed';
 if(status==='approved')return 'Profile reviewed · PVMC credential status separate';
 if(status==='rejected')return 'Credential review needs attention';
 return 'Practitioner credential review separate';
}
export default async function CareerWorkspaceFrame({
 active,module='career',name,headline,location,photoUrl,approved=false,verificationStatus,
 cvStatus,emailAlerts,title,description,children
}:Props){
 const current=WORKSPACE_LINKS.find(link=>link.id===active);
 const identity=await getCurrentIdentity();
 const roles=identity?.roles??[];
 const professionalRole=roles.some(role=>['veterinarian','professional','candidate'].includes(role));
 const clinicRole=roles.some(role=>['veterinarian','professional','company'].includes(role));
 const companyRole=roles.includes('company');
 // Navigation visibility is only presentation; each destination retains its own
 // server-side authorization and ownership rules.
 const menu=WORKSPACE_LINKS.filter(link=>{
  if(link.id==='clinic')return clinicRole;
  if(link.id==='company')return companyRole || active==='company';
  if(['overview','profile','cv','letter','preferences','connections','applications'].includes(link.id))return professionalRole || link.id===active;
  return true;
 });
 const practitioner=roles.includes('veterinarian');
 const credential=practitioner&&identity
   ? await (await createClient()).from('veterinarian_profiles')
     .select('pvmc_number,pvmc_verification_status').eq('user_id',identity.userId).maybeSingle()
   : null;
 const hasPvmcNumber=Boolean(credential?.data?.pvmc_number?.trim());
 const credentialReviewed=credential?.data?.pvmc_verification_status==='approved';
 // Ignore older route-specific checklists: use one shared core-progress calculation.
 const sharedProgress=await getCoreProfileProgress();
 const completion=sharedProgress?.percent??null;
 const coreChecks=sharedProgress?.checks;
 const isVeterinaryPractitioner=sharedProgress?.isVeterinaryPractitioner??false;
 const navigation=(mobile:boolean)=><nav className="vcx-navigation" aria-label={mobile?'Mobile workspace tools':'Workspace tools'}>
  {menu.filter(link=>approved||!link.requiresApproval||link.id===active).map(link=><Link
    key={link.id} href={link.href} aria-current={link.id===active?'page':undefined}
    className={link.id===active?'vcx-nav-link is-active':'vcx-nav-link'}>
    <span className="vcx-nav-symbol" aria-hidden="true">{SYMBOLS[link.id]}</span>
    <span>{link.label}</span>
  </Link>)}
 </nav>;
 const fallback=name.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()).join('')||'VC';
 return <main className="vcx-app" data-module={module}>
  <aside className="vcx-sidebar">
   <Link className="vcx-brand" href="/" aria-label="VetConnect public website"><Image src="/vetconnect-logo.png" alt="VetConnect" width={155} height={50} unoptimized/></Link>
   <span className="vcx-sidebar-eyebrow">{module==='company'?'ORGANIZATION WORKSPACE':'MY WORKSPACE'}</span>
   {navigation(false)}
   <div className="vcx-sidebar-foot">
    <b>One profile. Many opportunities.</b>
    <p>Manage your career, documents and company connections under your own identity.</p>
    <Link href="/dashboard">Account settings</Link>
   </div>
  </aside>
  <div className="vcx-workspace">
   <header className="vcx-topbar">
    <details className="vcx-mobile-menu">
     <summary>☰ <span>Workspace menu</span></summary>
     {navigation(true)}
    </details>
    <div className="vcx-breadcrumb">My VetConnect <span aria-hidden="true">/</span> <b>{current?.label??'Workspace'}</b></div>
    <div className="vcx-top-actions"><Link href="/dashboard">Account</Link><Link href="/">Visit VetConnect</Link><span className="vcx-user-mark" aria-hidden="true">{fallback}</span></div>
   </header>
   <div className="vcx-content">
    <div className="vcx-intro">
     <div><span className="vcx-eyebrow">{module==='clinic'?'VETERINARY PRACTICE':module==='company'?'COMPANY WORKSPACE':module==='account'?'ACCOUNT & IDENTITY':'PROFESSIONAL WORKSPACE'}</span><h1>{title}</h1><p>{description}</p></div>
    <Link className="vcx-button vcx-button-outline" href={module==='clinic'?'/career/connections':module==='company'?'/dashboard':module==='account'?'/career':cvStatus==='saved'?'/career/cv/print':'/career/cv'} target={module==='career'&&cvStatus==='saved'?'_blank':undefined} rel={module==='career'&&cvStatus==='saved'?'noopener noreferrer':undefined}>{module==='clinic'?'My connections':module==='company'?'Account settings':module==='account'?'Professional workspace':cvStatus==='saved'?'View saved CV':'Create my CV'}</Link>
    </div>
    <article className="vcx-identity-card">
     <div className="vcx-portrait-frame"><ProfilePhoto imageUrl={photoUrl??null} name={name} fallback={fallback}/></div>
     <div className="vcx-identity-main">
      <span className="vcx-eyebrow">{module==='company'?'CURRENT ORGANIZATION':'YOUR PERSONAL PROFILE'}</span>
      <h2>{name||'My professional profile'}</h2>
      <p>{headline||'Veterinary & animal-health professional'}</p>
      {location&&<p>{location}</p>}
      <div className="vcx-pills"><span>{module==='company'?`Company review: ${verificationStatus??'pending'}`:profileReview(verificationStatus,isVeterinaryPractitioner)}</span>
       {hasPvmcNumber&&<span className="vcx-credential-tag">{credentialReviewed?'PVMC credential reviewed':'PVMC number provided · verification pending'}</span>}
       {cvStatus&&<span>{cvStatus==='saved'?'CV details saved':cvStatus==='draft'?'CV draft started':'CV not saved yet'}</span>}
       {emailAlerts!==undefined&&<span>Job emails {emailAlerts?'on':'off'}</span>}
      </div>
      {module!=='company'&&<Link className="vcx-photo-link" href="/dashboard/professional?step=photo">Edit my profile photo</Link>}
     </div>
     {module!=='company'&&module!=='clinic'&&completion!==null&&<div className="vcx-identity-progress">
      <strong>{completion}%</strong><small>Core profile information</small>
      <progress value={completion} max={100} aria-label="Core profile information completion"/>
     </div>}
    </article>
    <div className="vcx-content-grid">
     <div className="vcx-primary">{children}</div>
     <aside className="vcx-right-rail" aria-label="Workspace summary">
      {module!=='company'&&module!=='clinic'&&<section className="vcx-side-card">
       <span className="vcx-eyebrow">YOUR PROGRESS</span><h2>Core profile checklist</h2>
       {coreChecks&&coreChecks.length?<ul className="vcx-checklist">{coreChecks.map(item=><li key={item.label}>
         <span className={item.done?'vcx-check is-done':'vcx-check'} aria-hidden="true">{item.done?'✓':'○'}</span>
         {item.label}
       </li>)}</ul>:<p className="vcx-secondary">Complete your details at your own pace. Verification is a separate review.</p>}
       <p className="vcx-secondary">Optional photos, CVs, credentials, and job interests do not affect core progress. This is not a verification score.</p>
      </section>}
      {isVeterinaryPractitioner&&module!=='company'&&<section className="vcx-side-card">
       <span className="vcx-eyebrow">VETERINARY CREDENTIAL</span>
       <h2>PVMC registration check</h2>
       <p className="vcx-secondary">Your CV and profile can be saved without PVMC approval. Licensed veterinary practice requires separate credential verification. VetConnect does not automatically verify the PVMC registry.</p>
       <a href="https://pvmc.gov.pk/Registration/Search" target="_blank" rel="noopener noreferrer" className="vcx-button vcx-button-outline">Check the official PVMC register</a>
      </section>}
      {module==='clinic'?<section className="vcx-side-card">
       <span className="vcx-eyebrow">CLINIC PRACTICE</span><h2>Clinic operations</h2>
       <p className="vcx-secondary">Clinic publication requires a separate VetConnect facility review. A saved or completed personal profile is not a clinic approval.</p>
       <Link className="vcx-button vcx-button-outline" href="/dashboard/clinics">Manage my clinics</Link>
      </section>:module==='company'?<section className="vcx-side-card">
       <span className="vcx-eyebrow">SEPARATE IDENTITY</span><h2>Company workspace</h2>
       <p className="vcx-secondary">Company records and permissions remain separate from this user's professional CV and personal account.</p>
       <Link className="vcx-button vcx-button-outline" href="/career/connections">Professional connections</Link>
      </section>:<section className="vcx-side-card">
       <span className="vcx-eyebrow">YOUR CV</span><h2>VetConnect CV Builder</h2>
       <div className="vcx-tiny-cv" aria-hidden="true"><div><b>VETCONNECT</b><small>PROFESSIONAL CV</small></div><i/><i/><i/><i/><i/></div>
       <Link className="vcx-button vcx-button-outline" href="/career/cv">Create or edit CV</Link>
      </section>}
     </aside>
    </div>
    <p className="vcx-privacy-note"><Link href="/about">About VetConnect</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>. A personal profile and a company or clinic are separate records. Qualifications and employment require their own verification. Your private CV is shared only when you choose to use it in an application.</p>
   </div>
  </div>
 </main>;
}
