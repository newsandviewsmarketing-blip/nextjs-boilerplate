"use client";
import { useEffect, useState } from "react";
type Choice = {id:string;label:string};
export default function JobMasterChoice({name,label,category}: {name:string;label:string;category:"job_sector"|"job_qualification"}) {
  const [items,setItems]=useState<Choice[]>([]);
  const [choice,setChoice]=useState("");
  const [custom,setCustom]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/master-data?category="+encodeURIComponent(category),{cache:"no-store"})
      .then(r=>r.ok?r.json():{items:[]})
      .then(data=>{if(active)setItems((data.items??[]) as Choice[]);})
      .catch(()=>{if(active)setItems([])});
    return ()=>{active=false};
  },[category]);
  return <div>
    <label htmlFor={name+"_choice"}>{label}</label>
    <select id={name+"_choice"} value={choice} onChange={e=>{setChoice(e.target.value);setCustom("");}}>
      <option value="">Not specified</option>
      {items.map(item=><option key={item.id} value={item.label}>{item.label}</option>)}
      <option value="__other__">Other / Add new option</option>
    </select>
    {choice==="__other__" ? <>
      <input name={name} value={custom} maxLength={150} onChange={e=>setCustom(e.target.value)}
        placeholder={"Enter new "+label.toLowerCase()} aria-label={"New "+label}/>
      <p className="form-help">The value can be used in this pending job, but will appear in future dropdowns only after admin master-data approval.</p>
    </> : <input type="hidden" name={name} value={choice}/>}
  </div>;
}
