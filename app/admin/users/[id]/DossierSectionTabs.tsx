"use client";
import {useEffect,useState} from "react";

type Tab="overview"|"submission"|"documents"|"review"|"audit";
const tabs:{id:Tab;label:string;panel:string}[]=[
 {id:"overview",label:"Overview",panel:"identity"},
 {id:"submission",label:"Original Submission",panel:"linked"},
 {id:"documents",label:"Documents",panel:"uploads"},
 {id:"review",label:"Review & Actions",panel:"actions"},
 {id:"audit",label:"Audit History",panel:"history"},
];
function currentTab():Tab{
 if(typeof window==="undefined")return "overview";
 const hash=window.location.hash.replace(/^#/,"");
 return tabs.find(tab=>tab.panel===hash||tab.id===hash)?.id??"overview";
}
export default function DossierSectionTabs(){
 const [selected,setSelected]=useState<Tab>("overview");
 useEffect(()=>{
  const sync=()=>setSelected(currentTab());
  sync();
  window.addEventListener("hashchange",sync);
  return ()=>window.removeEventListener("hashchange",sync);
 },[]);
 useEffect(()=>{
  const host=document.querySelector<HTMLElement>(".vc-editor-dossier");
  if(host)host.dataset.dossierTab=selected;
  return ()=>{if(host)host.dataset.dossierTab="overview";};
 },[selected]);
 return <nav className="vc-editor-tabs vc-dossier-tab-navigation" aria-label="Account dossier sections">
  {tabs.map(tab=><button key={tab.id} type="button"
   aria-pressed={selected===tab.id} aria-controls={tab.panel}
   className={selected===tab.id?"button button-primary":"button button-secondary"}
   onClick={()=>{setSelected(tab.id);window.history.replaceState(null,"","#"+tab.panel);}}>
   {tab.label}
  </button>)}
 </nav>;
}
