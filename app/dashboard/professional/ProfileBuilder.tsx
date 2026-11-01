'use client';

import {useRef,useState,type ReactNode,type KeyboardEvent} from 'react';

import {PROFILE_SECTIONS as steps,type ProfileSectionId} from '@/lib/professional-workspace';

export default function ProfileBuilder({panels,initialStep,completed}:{panels:Record<ProfileSectionId,ReactNode>;initialStep?:string;completed:Partial<Record<ProfileSectionId,boolean>>;completion?:number}){
 const initial=steps.findIndex(step=>step.id===initialStep);
 const [active,setActive]=useState(initial<0?0:initial);
 const tabs=useRef<Array<HTMLButtonElement|null>>([]);
 const panel=useRef<HTMLDivElement>(null);
 function select(index:number,focusPanel=false){
  setActive(index);
  const url=new URL(window.location.href);
  url.searchParams.set('step',steps[index].id);
  window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  if(focusPanel)requestAnimationFrame(()=>{panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
 }
 function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number){
  let next=index;
  if(['ArrowRight','ArrowDown'].includes(event.key))next=Math.min(index+1,steps.length-1);
  else if(['ArrowLeft','ArrowUp'].includes(event.key))next=Math.max(index-1,0);
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=steps.length-1;
  else return;
  event.preventDefault();select(next);tabs.current[next]?.focus();
 }
 return <div className="profile-builder">
  <aside className="builder-sidebar">
   <div className="builder-progress"><span className="section-kicker">YOUR PROFILE SECTIONS</span><strong>Choose what to update</strong><p>These steps are independent of core profile completion and PVMC credential review. Optional information can be added later.</p></div>
   <label className="builder-mobile-selector">Profile section<select value={active} onChange={event=>select(Number(event.target.value),true)}>{steps.map((step,index)=><option key={step.id} value={index}>{index+1}. {step.label}{completed[step.id]?' · Saved':''}</option>)}</select></label>
   <div className="builder-step-list" role="tablist" aria-label="Profile builder sections">
    {steps.map((step,index)=><button key={step.id} type="button" role="tab" id={'builder-tab-'+step.id} aria-controls={'builder-panel-'+step.id} aria-selected={active===index} tabIndex={active===index?0:-1} ref={el=>{tabs.current[index]=el;}} onKeyDown={event=>navigate(event,index)} onClick={()=>select(index)} className={active===index?'builder-step is-active':'builder-step'}>
     <span className={completed[step.id]?'builder-step-number is-saved':'builder-step-number'} aria-hidden="true">{completed[step.id]?'✓':index+1}</span><span><b>{step.label}</b><small>{step.hint}</small></span><span className="builder-sr-only">{completed[step.id]?'Saved information present':'Review this section'}</span>
    </button>)}
   </div>
  </aside>
  <div className="builder-main" ref={panel} tabIndex={-1}>
   <details className="builder-saving-help"><summary>How saving works</summary><p>Save each section before submitting another section or leaving this page. Switching sections keeps your unsaved entries on this page.</p></details><div className="builder-section-bar"><span>STEP {active+1} OF {steps.length}</span><strong>{steps[active].label}</strong></div>
   {steps.map((step,index)=><div key={step.id} id={'builder-panel-'+step.id} role="tabpanel" aria-labelledby={'builder-tab-'+step.id} hidden={active!==index} className="builder-panel">{panels[step.id]}</div>)}
   <div className="builder-navigation"><button type="button" className="button button-secondary" disabled={active===0} onClick={()=>select(active-1,true)}>Previous section</button><span>{active+1} / {steps.length}</span>{active<steps.length-1?<button type="button" className="button button-primary" onClick={()=>select(active+1,true)}>Next section</button>:<a className="button button-primary" href="/career/cv">Continue to CV Builder</a>}</div>
  </div>
 </div>;
}
