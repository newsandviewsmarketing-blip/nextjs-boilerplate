"use client";
import { useState } from "react";

type SearchCategory = "vet" | "clinics" | "professionals" | "marketplace" | "jobs";
const tabs: { id:SearchCategory; label:string; title:string; action:string; cta:string }[] = [
  { id:"vet", label:"Find a Vet", title:"Find veterinary expertise", action:"/vets", cta:"Find veterinarians" },
  { id:"clinics", label:"Clinics", title:"Find a veterinary clinic", action:"/clinics", cta:"Find clinics" },
  { id:"professionals", label:"Professionals", title:"Find an animal-health professional", action:"/professionals", cta:"Find professionals" },
  { id:"marketplace", label:"Marketplace", title:"Find animal-health products", action:"/marketplace", cta:"Search marketplace" },
  { id:"jobs", label:"Jobs", title:"Find a career opportunity", action:"/jobs", cta:"Find jobs" },
];
const sectors=["All sectors","Pets","Livestock","Poultry","Dairy","Fisheries","Aquaculture","Equine"];
const jobSectors=["All sectors","Poultry","Dairy","Livestock","Sales & Marketing","Veterinary Services","Animal Health","Fisheries / Aquaculture","Academia / Research","Feed & Nutrition"];
export default function HomeQuickSearch(){
 const [selected,setSelected]=useState<SearchCategory>("vet");
 const current=tabs.find(t=>t.id===selected)!;
 return <div className="hero-search-card vc-quick-search">
  <div className="search-card-head"><div><small>QUICK SEARCH</small><h2 id="quick-search-title">{current.title}</h2></div></div>
  <div className="vc-quick-tabs" role="group" aria-label="What would you like to find?">
   {tabs.map(tab=><button type="button" key={tab.id} aria-pressed={selected===tab.id}
    className={selected===tab.id?"is-active":""} onClick={()=>setSelected(tab.id)}>{tab.label}</button>)}
  </div>
  <form key={selected} action={current.action} method="get" aria-labelledby="quick-search-title">
   <div className="vc-quick-fields">
    {selected!=="professionals"&&<div className="vc-quick-field">
     <label htmlFor="quick-city">{selected==="jobs"?"Job location":selected==="marketplace"?"Supplier city":"City"}</label>
     <input id="quick-city" name="city" type="search" placeholder="All cities (optional)" autoComplete="address-level2"/>
    </div>}
    {(selected==="vet"||selected==="marketplace"||selected==="jobs")&&<div className="vc-quick-field">
     <label htmlFor="quick-sector">{selected==="jobs"?"Job sector":"Animal / sector"}</label>
     <select id="quick-sector" name="sector" defaultValue="All sectors">
      {(selected==="jobs"?jobSectors:sectors).map(s=><option key={s} value={s}>{s}</option>)}
     </select>
    </div>}
    {selected==="professionals"&&<div className="vc-quick-field">
     <label htmlFor="quick-professional-type">Professional category</label>
     <select id="quick-professional-type" name="type" defaultValue="All professional types">
      {["All professional types","Veterinarian","Consultant","Animal Nutritionist","Researcher","Technologist","Farm Manager"].map(t=><option key={t}>{t}</option>)}
     </select>
    </div>}
    <div className="vc-quick-field vc-quick-keyword">
     <label htmlFor="quick-keyword">{selected==="vet"?"Name or specialization":selected==="clinics"?"Clinic, service or species":selected==="professionals"?"Expertise, skills or name":selected==="marketplace"?"Product, brand or company":"Job title or company"}</label>
     <input id="quick-keyword" name="q" type="search" placeholder={selected==="clinics"?"e.g. Pet care, cattle":selected==="professionals"?"e.g. Nutrition, consultancy":selected==="marketplace"?"e.g. Vaccine, feed, supplier":"Optional keyword"}/>
    </div>
   </div>
   <button type="submit" className="button button-primary button-full">{current.cta} →</button>
  </form>
  <p className="vc-quick-disclaimer">{selected==="marketplace"?"Supplier city is a business location, not a stock-availability guarantee.":selected==="professionals"?"Professional profiles and clinical practice services are listed separately.":"Public listings depend on approved profiles and available services."}</p>
 </div>;
}
