"use client";

import {useState} from "react";

export type ClinicHoursRow={
 day_of_week:number;is_open:boolean;is_24_hours:boolean;
 opens_at:string|null;closes_at:string|null;
 break_start:string|null;break_end:string|null;
 appointment_enabled:boolean;slot_minutes:number;
};

type DayHours={
 open:boolean;allDay:boolean;start:string;end:string;
 breakStart:string;breakEnd:string;appointments:boolean;slot:number;
};
const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const defaultHours:DayHours={open:false,allDay:false,start:"09:00",end:"17:00",breakStart:"",breakEnd:"",appointments:false,slot:30};
const time=(value:string|null|undefined,fallback:string)=>value?.slice(0,5)||fallback;
function fromRow(row?:ClinicHoursRow):DayHours{
 if(!row)return {...defaultHours};
 return {open:row.is_open,allDay:row.is_24_hours,start:time(row.opens_at,"09:00"),
  end:time(row.closes_at,"17:00"),breakStart:time(row.break_start,""),
  breakEnd:time(row.break_end,""),appointments:row.appointment_enabled,
  slot:row.slot_minutes||30};
}
function summary(day:DayHours){
 if(!day.open)return "Closed";
 return (day.allDay?"24 hours":day.start+"–"+day.end)+
  (day.appointments?" · Bookings on":" · Bookings off");
}
export default function CompactClinicHours({
 clinicId,existing,action
}:{
 clinicId:string;existing:ClinicHoursRow[];
 action:(formData:FormData)=>void|Promise<void>;
}){
 const [days,setDays]=useState<DayHours[]>(()=>names.map((_,i)=>fromRow(existing.find(row=>row.day_of_week===i))));
 const [chosen,setChosen]=useState<boolean[]>(()=>names.map((_,i)=>existing.length===0?[1,2,3,4,5,6].includes(i):Boolean(existing.find(row=>row.day_of_week===i)?.is_open)));
 const [template,setTemplate]=useState<DayHours>({...defaultHours,open:true,appointments:true});
 const [editing,setEditing]=useState<number|null>(null);
 const [message,setMessage]=useState("");
 function update(index:number,patch:Partial<DayHours>){
  setDays(previous=>previous.map((day,i)=>i===index?{...day,...patch}:day));
 }
 function applyTemplate(){
  if(!chosen.some(Boolean)){setMessage("Choose at least one day to apply these hours.");return;}
  setDays(previous=>previous.map((day,i)=>chosen[i]?{...template,open:true}:day));
  setMessage("Hours applied to selected days. Review the weekly summary and save to confirm.");
 }
 function field(name:keyof DayHours,label:string,index:number,kind:"time"|"number"="time"){
  const day=days[index];
  const value=day[name] as string|number;
  return <label className="vcx-hours-input">{label}
   <input type={kind} value={value} min={kind==="number"?5:undefined} max={kind==="number"?240:undefined}
    step={kind==="number"?5:undefined} onChange={e=>update(index,{[name]:kind==="number"?Number(e.target.value):e.target.value})}/>
  </label>;
 }
 return <form id="clinic-hours" className="backend-form-card workspace-section-card workspace-heading-gap vcx-compact-hours" action={action}>
  <input type="hidden" name="clinic_id" value={clinicId}/>
  <div className="section-heading"><span className="section-kicker">HOURS & AVAILABILITY</span>
   <h2>Clinic opening hours & appointments</h2>
   <p>Set one schedule for several days, then adjust only the days that differ. Existing saved times remain unchanged until you apply and save.</p>
  </div>
  <section className="vcx-hours-template">
   <h3>1. Choose days</h3>
   <div className="vcx-hours-day-picker">{names.map((name,i)=><label key={name} className="vcx-hours-day">
    <input type="checkbox" checked={chosen[i]} onChange={e=>setChosen(previous=>previous.map((v,j)=>i===j?e.target.checked:v))}/>
    <span>{name}</span>
   </label>)}</div>
   <h3>2. Set common hours</h3>
   <div className="vcx-hours-fields">
    <label className="vcx-hours-input">Opens<input type="time" value={template.start} disabled={template.allDay} onChange={e=>setTemplate(v=>({...v,start:e.target.value}))}/></label>
    <label className="vcx-hours-input">Closes<input type="time" value={template.end} disabled={template.allDay} onChange={e=>setTemplate(v=>({...v,end:e.target.value}))}/></label>
    <label className="vcx-hours-input">Break start (optional)<input type="time" value={template.breakStart} disabled={template.allDay} onChange={e=>setTemplate(v=>({...v,breakStart:e.target.value}))}/></label>
    <label className="vcx-hours-input">Break end (optional)<input type="time" value={template.breakEnd} disabled={template.allDay} onChange={e=>setTemplate(v=>({...v,breakEnd:e.target.value}))}/></label>
    <label className="vcx-hours-input">Appointment length (min)<input type="number" min={5} max={240} step={5} value={template.slot} onChange={e=>setTemplate(v=>({...v,slot:Number(e.target.value)}))}/></label>
   </div>
   <div className="vcx-hours-toggles">
    <label className="vcx-hours-check"><input type="checkbox" checked={template.allDay} onChange={e=>setTemplate(v=>({...v,allDay:e.target.checked,breakStart:e.target.checked?"":v.breakStart,breakEnd:e.target.checked?"":v.breakEnd}))}/>24-hour operation</label>
    <label className="vcx-hours-check"><input type="checkbox" checked={template.appointments} onChange={e=>setTemplate(v=>({...v,appointments:e.target.checked}))}/>Accept appointment requests</label>
   </div>
   <button type="button" className="button button-secondary" onClick={applyTemplate}>Apply to selected days</button>
   {message&&<p role="status" className="form-help">{message}</p>}
  </section>
  <section className="vcx-hours-week" aria-label="Review weekly opening hours">
   <h3>3. Review your week</h3>
   <div className="vcx-hours-summary">
    {days.map((day,i)=><div key={i} className="vcx-hours-row">
     <strong>{names[i]}</strong>
     <span>{summary(day)}</span>
     <button type="button" className="vcx-hours-edit" onClick={()=>setEditing(v=>v===i?null:i)} aria-expanded={editing===i}>{editing===i?"Done":"Edit"}</button>
     {editing===i&&<div className="vcx-hours-override">
      <label className="vcx-hours-check"><input type="checkbox" checked={day.open} onChange={e=>update(i,{open:e.target.checked})}/>Open this day</label>
      {day.open&&<>
       <label className="vcx-hours-check"><input type="checkbox" checked={day.allDay} onChange={e=>update(i,{allDay:e.target.checked,breakStart:e.target.checked?"":day.breakStart,breakEnd:e.target.checked?"":day.breakEnd})}/>24 hours</label>
       {!day.allDay&&<div className="vcx-hours-fields">
        {field("start","Opens",i)}{field("end","Closes",i)}
        {field("breakStart","Break start",i)}{field("breakEnd","Break end",i)}
       </div>}
       <label className="vcx-hours-check"><input type="checkbox" checked={day.appointments} onChange={e=>update(i,{appointments:e.target.checked})}/>Accept appointment requests</label>
       {day.appointments&&field("slot","Slot duration (min)",i,"number")}
      </>}
     </div>}
    </div>)}
   </div>
  </section>
  {days.map((day,i)=><div key={i}>
   {day.open&&<input type="hidden" name={`day_${i}_open`} value="on"/>}
   {day.open&&day.allDay&&<input type="hidden" name={`day_${i}_24h`} value="on"/>}
   <input type="hidden" name={`day_${i}_opens`} value={day.start}/>
   <input type="hidden" name={`day_${i}_closes`} value={day.end}/>
   <input type="hidden" name={`day_${i}_break_start`} value={day.allDay?"":day.breakStart}/>
   <input type="hidden" name={`day_${i}_break_end`} value={day.allDay?"":day.breakEnd}/>
   {day.open&&day.appointments&&<input type="hidden" name={`day_${i}_appointments`} value="on"/>}
   <input type="hidden" name={`day_${i}_slot`} value={day.slot}/>
  </div>)}
  <p className="form-help">Saving updates your clinic's weekly availability and the public hours summary. A booking request is not a confirmed appointment until accepted by your clinic.</p>
  <button type="submit" className="button button-primary">Save weekly schedule</button>
 </form>;
}
