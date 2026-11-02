'use client';

import {useEffect,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {PROFILE_SECTIONS as steps,type ProfileSectionId} from '@/lib/professional-workspace';

type Props={
 panels:Record<ProfileSectionId,ReactNode>;
 initialStep?:string;
 completed:Partial<Record<ProfileSectionId,boolean>>;
 completion?:number; // retained for existing page callers
};

const stepIndex=(id?:string|null)=>{
 const found=steps.findIndex(step=>step.id===id);
 return found<0?0:found;
};

/** The active section, its URL and the visible form must always agree. */
export default function ProfileBuilder({panels,initialStep,completed}:Props){
 const [active,setActive]=useState(()=>stepIndex(initialStep));
 const tabs=useRef<Array<HTMLButtonElement|null>>([]);
 const panel=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  function syncFromUrl(){
   const selected=new URLSearchParams(window.location.search).get('step');
   setActive(stepIndex(selected));
  }
  window.addEventListener('popstate',syncFromUrl);
  return ()=>window.removeEventListener('popstate',syncFromUrl);
 },[]);

 function select(index:number,focusPanel=false){
  if(index<0||index>=steps.length)return;
  setActive(index);
  const url=new URL(window.location.href);
  url.searchParams.set('step',steps[index].id);
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  if(focusPanel){
   requestAnimationFrame(()=>{
    panel.current?.focus({preventScroll:true});
    panel.current?.scrollIntoView({
     behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
     block:'start'
    });
   });
  }
 }

 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  let next=index;
  if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%steps.length;
  else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index-1+steps.length)%steps.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=steps.length-1;
  else return;
  event.preventDefault();
  select(next);
  tabs.current[next]?.focus();
 }

 const selected=steps[active];

 return <section className="profile-builder" aria-label="Professional profile builder">
   <div className="builder-sidebar">
    <div className="builder-current-label">
     <span className="section-kicker">PROFILE BUILDER</span>
     <strong>Step {active+1} of {steps.length}: {selected.label}</strong>
     <p>Select one section. Your other details remain available without leaving this page.</p>
    </div>
    <label className="builder-mobile-selector" htmlFor="profile-section-select">
     Select profile section
     <select id="profile-section-select" value={selected.id}
      onChange={event=>select(stepIndex(event.target.value),true)}>
      {steps.map((step,index)=><option key={step.id} value={step.id}>{index+1}. {step.label}{completed[step.id]?' · Saved':''}</option>)}
     </select>
    </label>
    <div className="builder-step-list" role="tablist" aria-label="Profile sections">
     {steps.map((step,index)=><button key={step.id} type="button"
       role="tab" id={'builder-tab-'+step.id} aria-controls={'builder-panel-'+step.id}
       aria-selected={active===index} tabIndex={active===index?0:-1}
       ref={el=>{tabs.current[index]=el;}}
       onKeyDown={event=>navigate(event,index)}
       onClick={()=>select(index,true)}
       className={active===index?'builder-step is-active':'builder-step'}>
       <span className={completed[step.id]?'builder-step-number is-saved':'builder-step-number'} aria-hidden="true">
        {completed[step.id]?'✓':index+1}
       </span>
       <span className="builder-step-label">{step.label}</span>
       {active===index&&<span className="builder-active-dot" aria-hidden="true"/>}
      </button>)}
    </div>
   </div>
   <div className="builder-main" ref={panel} tabIndex={-1}>
    <div className="builder-section-bar" aria-live="polite">
     <span>STEP {active+1} OF {steps.length}</span>
     <strong>{selected.label}</strong>
    </div>
    <details className="builder-saving-help">
     <summary>How saving works</summary>
     <p>Save changes in each section before leaving. You can switch sections without clearing fields you have not submitted on this page.</p>
    </details>
    {steps.map((step,index)=><div key={step.id} id={'builder-panel-'+step.id}
     role="tabpanel" aria-labelledby={'builder-tab-'+step.id} hidden={active!==index}
     className="builder-panel">{panels[step.id]}</div>)}
    <div className="builder-navigation">
     <button type="button" className="button button-secondary" disabled={active===0}
      onClick={()=>select(active-1,true)}>Previous section</button>
     <span aria-label="Current profile step">{active+1} / {steps.length}</span>
     {active<steps.length-1
      ?<button type="button" className="button button-primary"
        onClick={()=>select(active+1,true)}>Next: {steps[active+1].label}</button>
      :<a className="button button-primary" href="/career/cv">Continue to CV Builder</a>}
    </div>
   </div>
  </section>;
}
