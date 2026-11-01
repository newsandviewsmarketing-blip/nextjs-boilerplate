'use client';
import {useRef,useState,type ReactNode} from 'react';
import VetConnectCvSheet,{type CvSheetData} from '@/app/components/VetConnectCvSheet';
import {saveCareerCvBuilderAction} from '../actions';
const steps=['Personal details','Experience','Education','Expertise','Review & save'];
export default function CvComposer({cv,photoUrl,location,disabled,photoForm,saved=false}:{cv:CvSheetData;photoUrl?:string|null;location?:string;disabled:boolean;photoForm:ReactNode;saved?:boolean}){
 const [step,setStep]=useState(saved?4:0),[draft,setDraft]=useState(cv);
 const form=useRef<HTMLFormElement>(null);
 function next(){
  const current=form.current?.querySelector('[data-cv-step="'+step+'"]');
  const inputs=current?.querySelectorAll<HTMLInputElement>('input,textarea');
  if(inputs)for(const input of inputs){if(!input.reportValidity())return;}
  setStep(Math.min(step+1,4));
 }
 function readDraft(){if(!form.current)return;const values=new FormData(form.current);setDraft(Object.fromEntries(['full_name','headline','contact_email','phone','experience','education','skills'].map(key=>[key,String(values.get(key)??'')])));}
 return <div className="cv-composer">
 <div className="cv-composer-progress"><span>STEP {step+1} OF 5</span><strong>{steps[step]}</strong><progress value={step+1} max={5} aria-label="CV builder step"/></div>
 {step===0&&<details className="cv-photo-disclosure"><summary>Photograph: add or update</summary>{photoForm}</details>}
 <form ref={form} action={saveCareerCvBuilderAction} onChange={readDraft} onInvalidCapture={event=>{const el=event.target as HTMLElement;const section=el.closest('[data-cv-step]');if(section)setStep(Number(section.getAttribute('data-cv-step')));}} className="profile-form">
 <fieldset data-cv-step="0" hidden={step!==0}><legend>Personal details</legend><p>Your existing profile details are prefilled. Review them before continuing.</p><div className="form-grid">
 {([['full_name','Full name','text'],['headline','Profession / headline','text'],['contact_email','Contact email','email'],['phone','Phone','tel']] as const).map(([key,label,type])=><div key={key}><label htmlFor={'composer-'+key}>{label}{key==='full_name'?' *':''}</label><input id={'composer-'+key} name={key} type={type} required={key==='full_name'} maxLength={key==='phone'?40:key==='full_name'?120:200} defaultValue={cv[key]??''}/></div>)}
 </div>{location&&<p className="form-help">Profile location: {location}</p>}</fieldset>
 <fieldset data-cv-step="1" hidden={step!==1}><legend>Work experience</legend><p>List your most recent role first, with employer, dates and responsibilities. Students and newcomers can leave this blank or include genuine internships and placements.</p><label htmlFor="composer-experience">Experience and placements</label><textarea id="composer-experience" name="experience" rows={9} maxLength={4000} defaultValue={cv.experience??''}/></fieldset>
 <fieldset data-cv-step="2" hidden={step!==2}><legend>Education & qualifications</legend><p>List your most recent qualification first, followed by the institution, subject and dates. Include ongoing studies accurately.</p><label htmlFor="composer-education">Academic qualifications</label><textarea id="composer-education" name="education" rows={9} maxLength={3000} defaultValue={cv.education??''}/></fieldset>
 <fieldset data-cv-step="3" hidden={step!==3}><legend>Expertise & skills</legend><p>Add relevant technical skills, languages, training and certifications. Include only information you can support.</p><label htmlFor="composer-skills">Skills and additional professional information</label><textarea id="composer-skills" name="skills" rows={9} maxLength={3000} defaultValue={cv.skills??''}/></fieldset>
 <fieldset data-cv-step="4" hidden={step!==4}><legend>Review your CV</legend><p>This preview uses your current entries. Save the draft before opening the printable version.</p><VetConnectCvSheet cv={draft} photoUrl={photoUrl} location={location}/></fieldset>
 <div className="cv-composer-actions"><button className="button button-secondary" type="button" disabled={step===0} onClick={()=>setStep(step-1)}>Previous</button>{step<4?<button type="button" className="button button-primary" onClick={next}>Continue</button>:<button type="submit" disabled={disabled} className="button button-primary">Save my CV</button>}</div>
 </form><p className="form-help">Your entries are saved when you select Save my CV. Do not leave or reload before saving.</p>
 </div>;
}
