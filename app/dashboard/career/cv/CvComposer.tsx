'use client';
import {useRef,useState,type ReactNode} from 'react';
import VetConnectCvSheet,{type CvSheetData} from '@/app/components/VetConnectCvSheet';
import {CAREER_SKILL_SUGGESTIONS,PROFESSIONAL_TITLE_SUGGESTIONS} from '@/lib/career-options';
import {saveCareerCvBuilderAction} from '../actions';

const steps=['Personal details','Experience','Education','Expertise','Review & save'];

export default function CvComposer({
 cv,photoUrl,location,disabled,photoForm,saved=false
}:{cv:CvSheetData;photoUrl?:string|null;location?:string;disabled:boolean;photoForm:ReactNode;saved?:boolean}){
 const [step,setStep]=useState(saved?4:0),[draft,setDraft]=useState(cv);
 const [skillText,setSkillText]=useState(cv.skills??'');
 const [skillSuggestion,setSkillSuggestion]=useState('');
 const form=useRef<HTMLFormElement>(null);

 function next(){
  const current=form.current?.querySelector('[data-cv-step="'+step+'"]');
  const inputs=current?.querySelectorAll<HTMLInputElement>('input,textarea');
  if(inputs)for(const input of inputs){if(!input.reportValidity())return;}
  setStep(Math.min(step+1,4));
 }
 function readDraft(){
  if(!form.current)return;
  const values=new FormData(form.current);
  setDraft(Object.fromEntries(['full_name','headline','contact_email','phone','experience','education','skills'].map(key=>[key,String(values.get(key)??'')])));
 }
 function addSkill(){
  if(!skillSuggestion)return;
  const existing=skillText.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);
  if(existing.some(v=>v.toLowerCase()===skillSuggestion.toLowerCase())){setSkillSuggestion('');return;}
  const updated=[skillText.trim().replace(/[,;\s]+$/,''),skillSuggestion].filter(Boolean).join(', ');
  if(updated.length>3000)return;
  setSkillText(updated);setDraft(previous=>({...previous,skills:updated}));
  setSkillSuggestion('');
 }
 return <div className="cv-composer">
  <div className="cv-composer-progress"><span>STEP {step+1} OF 5</span><strong>{steps[step]}</strong><progress value={step+1} max={5} aria-label="CV builder step"/></div>
  {step===0&&<details className="cv-photo-disclosure"><summary>Photograph: add or update</summary>{photoForm}</details>}
  <form ref={form} action={saveCareerCvBuilderAction} onChange={readDraft} onInvalidCapture={event=>{
    const el=event.target as HTMLElement;const section=el.closest('[data-cv-step]');
    if(section)setStep(Number(section.getAttribute('data-cv-step')));
  }} className="profile-form">
   <fieldset data-cv-step="0" hidden={step!==0}>
    <legend>Personal details</legend>
    <p>Your saved profile information is prefilled. Select a suggested profession, or enter your own accurate headline.</p>
    <div className="form-grid">{([
      ['full_name','Full name','text'],['headline','Profession / headline','text'],
      ['contact_email','Contact email','email'],['phone','Phone','tel']
    ] as const).map(([key,label,type])=><div key={key}>
      <label htmlFor={'composer-'+key}>{label}{key==='full_name'?' *':''}</label>
      <input id={'composer-'+key} name={key} type={type} list={key==='headline'?'cv-professions':undefined}
        required={key==='full_name'} maxLength={key==='phone'?40:key==='full_name'?120:200} defaultValue={cv[key]??''}/>
     </div>)}</div>
    <datalist id="cv-professions">{PROFESSIONAL_TITLE_SUGGESTIONS.map(v=><option key={v} value={v}/>)}</datalist>
    <p className="form-help">Your current city: {location||'Not set'}. <a href="/dashboard#account-settings">Update city, province or contact details in your account</a>. A different job-search city can be selected after saving your CV.</p>
   </fieldset>
   <fieldset data-cv-step="1" hidden={step!==1}>
    <legend>Work experience</legend><p>List your most recent role first with employer, dates and responsibilities. Students and newcomers can leave this blank or include genuine internships and placements.</p>
    <label htmlFor="composer-experience">Experience and placements</label>
    <textarea id="composer-experience" name="experience" rows={9} maxLength={4000} defaultValue={cv.experience??''}/>
   </fieldset>
   <fieldset data-cv-step="2" hidden={step!==2}>
    <legend>Education & qualifications</legend><p>List your most recent qualification first, then the institution, subject and dates. Include ongoing studies accurately.</p>
    <label htmlFor="composer-education">Academic qualifications</label>
    <textarea id="composer-education" name="education" rows={9} maxLength={3000} defaultValue={cv.education??''}/>
   </fieldset>
   <fieldset data-cv-step="3" hidden={step!==3}>
    <legend>Skills & expertise</legend><p>Choose a suggested technical skill, or write your own. Add only skills you actually have. These CV skills can support job matching when you opt in to alerts.</p>
    <label htmlFor="composer-skills">Skills and additional professional information</label>
    <textarea id="composer-skills" name="skills" rows={7} maxLength={3000} value={skillText} onChange={e=>setSkillText(e.target.value)}/>
    <div className="cv-skill-selector">
     <label htmlFor="cv-suggested-skill">Add a suggested skill (optional)</label>
     <div><select id="cv-suggested-skill" value={skillSuggestion} onChange={e=>setSkillSuggestion(e.target.value)}>
      <option value="">Choose a skill</option>
      {CAREER_SKILL_SUGGESTIONS.map(v=><option key={v} value={v}>{v}</option>)}
     </select><button type="button" className="button button-secondary" disabled={!skillSuggestion} onClick={addSkill}>Add skill</button></div>
    </div>
   </fieldset>
   <fieldset data-cv-step="4" hidden={step!==4}>
    <legend>Review your CV</legend><p>This preview uses your current entries. Save the draft before opening the printable version.</p>
    <VetConnectCvSheet cv={draft} photoUrl={photoUrl} location={location}/>
   </fieldset>
   <div className="cv-composer-actions"><button className="button button-secondary" type="button" disabled={step===0} onClick={()=>setStep(step-1)}>Previous</button>
    {step<4?<button type="button" className="button button-primary" onClick={next}>Continue</button>:<button type="submit" disabled={disabled} className="button button-primary">Save my CV</button>}
   </div>
  </form>
  <p className="form-help">Your entries are saved when you select Save my CV. Do not leave or reload before saving. Future job interests remain separate from your CV.</p>
 </div>;
}
