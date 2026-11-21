"use client";
import {useEffect,useState} from "react";

type Tab="profile"|"documents"|"review";
const groups:Record<Tab,string[]>={
  profile:["identity","linked"],
  documents:["uploads"],
  review:["actions","history"],
};
const labels:Record<Tab,string>={
  profile:"1. Profile",
  documents:"2. Documents",
  review:"3. Review & Actions",
};
function tabFromHash():Tab {
  if(typeof window==="undefined")return "profile";
  const target=window.location.hash.replace("#","");
  return (Object.keys(groups) as Tab[]).find(key=>groups[key].includes(target))||"profile";
}
export default function DossierSectionTabs(){
  const [selected,setSelected]=useState<Tab>("profile");
  useEffect(()=>{
    const sync=()=>setSelected(tabFromHash());
    sync();
    window.addEventListener("hashchange",sync);
    return ()=>window.removeEventListener("hashchange",sync);
  },[]);
  useEffect(()=>{
    for(const [tab,ids] of Object.entries(groups)){
      for(const id of ids){
        const element=document.getElementById(id);
        if(element)element.hidden=tab!==selected;
      }
    }
    return ()=>{
      for(const ids of Object.values(groups))for(const id of ids){
        const element=document.getElementById(id);
        if(element)element.hidden=false;
      }
    };
  },[selected]);
  return <nav className="vc-editor-tabs" aria-label="Account dossier sections">
    {(Object.keys(groups) as Tab[]).map(tab=><button key={tab} type="button"
      aria-pressed={selected===tab}
      className={selected===tab?"button button-primary":"button button-secondary"}
      onClick={()=>{setSelected(tab);history.replaceState(null,"","#"+groups[tab][0]);}}>
      {labels[tab]}
    </button>)}
  </nav>;
}
