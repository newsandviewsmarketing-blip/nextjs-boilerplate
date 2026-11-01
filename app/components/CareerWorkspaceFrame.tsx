import type {ReactNode} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProfilePhoto from '@/app/components/ProfilePhoto';
import {WORKSPACE_LINKS} from '@/lib/professional-workspace';
import './CareerWorkspaceFrame.css';

type WorkspaceId=(typeof WORKSPACE_LINKS)[number]['id'];
type Check={label:string;done:boolean;optional?:boolean};
type Props={
 active:WorkspaceId;
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
 overview:'▦',profile:'◉',cv:'▤',preferences:'⌖',
 letter:'✉',connections:'◇',applications:'☷',
};
function profileReview(status?:string|null){
 if(status==='approved')return 'Approved professional profile';
 if(status==='rejected')return 'Profile needs correction';
 if(status==='pending')return 'Professional review pending';
 return 'Professional verification not confirmed';
}
export default function CareerWorkspaceFrame({
 active,name,headline,location,photoUrl,approved=false,verificationStatus,
 cvStatus,emailAlerts,checklist,title,description,children
}:Props){
 const current=WORKSPACE_LINKS.find(link=>link.id===active);
 const completion=checklist&&checklist.length?
   Math.round(checklist.filter(item=>item.done).length/checklist.length*100):null;
 const navigation=(mobile:boolean)=><nav className="vcx-navigation" aria-label={mobile?'Mobile workspace tools':'Workspace tools'}>
  {WORKSPACE_LINKS.filter(link=>approved||!link.requiresApproval||link.id===active).map(link=><Link
    key={link.id} href={link.href} aria-current={link.id===active?'page':undefined}
    className={link.id===active?'vcx-nav-link is-active':'vcx-nav-link'}>
    <span className="vcx-nav-symbol" aria-hidden="true">{SYMBOLS[link.id]}</span>
    <span>{link.label}</span>
  </Link>)}
 </nav>;
 const fallback=name.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()).join('')||'VC';
 return <main className="vcx-app">
  <aside className="vcx-sidebar">
   <Link className="vcx-brand" href="/" aria-label="VetConnect public website"><Image src="/vetconnect-logo.png" alt="VetConnect" width={155} height={50} unoptimized/></Link>
   <span className="vcx-sidebar-eyebrow">MY WORKSPACE</span>
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
     <div><span className="vcx-eyebrow">PROFESSIONAL WORKSPACE</span><h1>{title}</h1><p>{description}</p></div>
     <Link className="vcx-button vcx-button-outline" href="/career/cv/print" target="_blank" rel="noopener noreferrer">CV preview</Link>
    </div>
    <article className="vcx-identity-card">
     <div className="vcx-portrait-frame"><ProfilePhoto imageUrl={photoUrl??null} name={name} fallback={fallback}/></div>
     <div className="vcx-identity-main">
      <span className="vcx-eyebrow">YOUR PERSONAL PROFILE</span>
      <h2>{name||'My professional profile'}</h2>
      <p>{headline||'Veterinary & animal-health professional'}</p>
      {location&&<p>{location}</p>}
      <div className="vcx-pills"><span>{profileReview(verificationStatus)}</span>
       {cvStatus&&<span>{cvStatus==='saved'?'CV details saved':cvStatus==='draft'?'CV draft started':'CV not saved yet'}</span>}
       {emailAlerts!==undefined&&<span>Job emails {emailAlerts?'on':'off'}</span>}
      </div>
      <Link className="vcx-photo-link" href="/dashboard/professional?step=photo">Edit my profile photo</Link>
     </div>
     {completion!==null&&<div className="vcx-identity-progress">
      <strong>{completion}%</strong><small>Profile checklist</small>
      <progress value={completion} max={100} aria-label="Profile checklist completion"/>
     </div>}
    </article>
    <div className="vcx-content-grid">
     <div className="vcx-primary">{children}</div>
     <aside className="vcx-right-rail" aria-label="Workspace summary">
      <section className="vcx-side-card">
       <span className="vcx-eyebrow">YOUR PROGRESS</span><h2>Profile checklist</h2>
       {checklist&&checklist.length?<ul className="vcx-checklist">{checklist.map(item=><li key={item.label}>
         <span className={item.done?'vcx-check is-done':'vcx-check'} aria-hidden="true">{item.done?'✓':'○'}</span>
         {item.label}{item.optional?' (optional)':''}
       </li>)}</ul>:<p className="vcx-secondary">Complete your details at your own pace. Verification is a separate review.</p>}
       <p className="vcx-secondary">Experience is optional for students and new graduates.</p>
      </section>
      <section className="vcx-side-card">
       <span className="vcx-eyebrow">YOUR CV</span><h2>VetConnect CV Builder</h2>
       <div className="vcx-tiny-cv" aria-hidden="true"><div><b>VETCONNECT</b><small>PROFESSIONAL CV</small></div><i/><i/><i/><i/><i/></div>
       <Link className="vcx-button vcx-button-outline" href="/career/cv">Create or edit CV</Link>
      </section>
     </aside>
    </div>
    <p className="vcx-privacy-note">A personal profile and a company or clinic are separate records. Qualifications and employment require their own verification. Your private CV is shared only when you choose to use it in an application.</p>
   </div>
  </div>
 </main>;
}
