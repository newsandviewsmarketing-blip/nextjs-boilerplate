"use client";
import {useEffect,useState} from "react";

type Section="registration"|"profiles"|"credentials"|"products"|"regulatory"|"jobs";
const sections: {id:Section;label:string;hashes:string[]}[]=[
  {id:"registration",label:"Registrations",hashes:["registration-review"]},
  {id:"profiles",label:"Profiles",hashes:["pending-profiles","profile-"]},
  {id:"credentials",label:"PVMC Credentials",hashes:["credential-checks","credential-"]},
  {id:"products",label:"Products",hashes:["pending-products","product-"]},
  {id:"regulatory",label:"Regulatory",hashes:["regulatory-"]},
  {id:"jobs",label:"Jobs",hashes:["jobs-review","job-"]},
];
function sectionForHash(hash:string):Section|null {
  const id=hash.replace(/^#/,"");
  return sections.find(s=>id===s.id||id===`review-panel-${s.id}`||s.hashes.some(prefix=>id.startsWith(prefix)))?.id??null;
}
export default function ReviewWorkspaceTabs({allowed,counts}:{
  allowed:Section[];
  counts:Partial<Record<Section,number>>;
}){
  const [selected,setSelected]=useState<Section>(allowed[0]??"registration");
  useEffect(()=>{
    const sync=()=>{
      const target=sectionForHash(window.location.hash);
      setSelected(target&&allowed.includes(target)?target:allowed[0]??"registration");
    };
    sync();
    window.addEventListener("hashchange",sync);
    return ()=>window.removeEventListener("hashchange",sync);
  },[allowed]);
  useEffect(()=>{
    const parent=document.querySelector<HTMLElement>(".vc-review-workspace");
    if(parent)parent.dataset.active=selected;
    return ()=>{if(parent)parent.dataset.active="registration";};
  },[selected]);
  return <nav className="vc-review-tab-list" aria-label="Select review queue">
    {sections.filter(s=>allowed.includes(s.id)).map(s=><button key={s.id} type="button"
      id={`review-tab-${s.id}`}
      aria-controls={`review-panel-${s.id}`}
      aria-pressed={selected===s.id}
      className={selected===s.id?"vc-review-tab is-active":"vc-review-tab"}
      onClick={()=>{setSelected(s.id);window.history.replaceState(null,"",`#review-panel-${s.id}`);}}>
      {s.label} <span className="vc-review-tab-count">{counts[s.id]??0}</span>
    </button>)}
  </nav>;
}
