"use client";
import { useState } from "react";

type SearchCategory = "vet" | "clinics" | "professionals" | "marketplace" | "jobs";
type SearchOptions={
 vet:{cities:string[];sectors:string[]};
 clinics:{cities:string[];types:string[]};
 professionals:{cities:string[];types:string[]};
 marketplace:{cities:string[];sectors:string[]};
 jobs:{cities:string[];sectors:string[]};
};
const tabs: {id:SearchCategory;label:string;title:string;action:string;cta:string}[]=[
 {id:"vet",label:"Find a Vet",title:"Find veterinary expertise",action:"/vets",cta:"Find veterinarians"},
 {id:"clinics",label:"Clinics",title:"Find a veterinary clinic",action:"/clinics",cta:"Find clinics"},
 {id:"professionals",label:"Professionals",title:"Find an animal-health professional",action:"/professionals",cta:"Find professionals"},
 {id:"marketplace",label:"Marketplace",title:"Find animal-health products",action:"/marketplace",cta:"Search marketplace"},
 {id:"jobs",label:"Jobs",title:"Find a career opportunity",action:"/jobs",cta:"Find jobs"}
];
export default function HomeQuickSearch({options}:{options:SearchOptions}){
 const [selected,setSelected]=useState<SearchCategory>("vet");
 const current=tabs.find(tab=>tab.id===selected)!;
 const cityOptions=options[selected].cities;
 const sectors=selected==="vet"?options.vet.sectors:selected==="marketplace"?options.marketplace.sectors:selected==="jobs"?options.jobs.sectors:[];
 return <div className="hero-search-card vc-quick-search">
  <div className="search-card-head"><div><small>QUICK SEARCH</small><h2 id="quick-search-title">{current.title}</h2></div></div>
  <div className="vc-quick-tabs" role="group" aria-label="What would you like to find?">
   {tabs.map(tab=><button type="button" key={tab.id} aria-pressed={selected===tab.id}
    className={selected===tab.id?"is-active":""} onClick={()=>setSelected(tab.id)}>{tab.label}</button>)}
  </div>
  <form key={selected} action={current.action} method="get" aria-labelledby="quick-search-title">
   <div className="vc-quick-fields">
    <div className="vc-quick-field">
     <label htmlFor="quick-city">{selected==="jobs"?"Job location":selected==="marketplace"?"Supplier city":"City"}</label>
     <select id="quick-city" name="city" defaultValue="">
      <option value="">All cities</option>
      {cityOptions.map(city=><option key={city} value={city}>{city}</option>)}
     </select>
    </div>
    {(selected==="vet"||selected==="marketplace"||selected==="jobs")&&<div className="vc-quick-field">
     <label htmlFor="quick-sector">{selected==="jobs"?"Job sector":selected==="marketplace"?"Product sector":"Animal / sector"}</label>
     <select id="quick-sector" name="sector" defaultValue="">
      <option value="">All sectors</option>
      {sectors.map(sector=><option key={sector} value={sector}>{sector}</option>)}
     </select>
    </div>}
    {selected==="clinics"&&<div className="vc-quick-field">
     <label htmlFor="quick-clinic-type">Clinic type</label>
     <select id="quick-clinic-type" name="type" defaultValue="">
      <option value="">All facility types</option>
      {options.clinics.types.map(type=><option key={type} value={type}>{type}</option>)}
     </select>
    </div>}
    {selected==="professionals"&&<div className="vc-quick-field">
     <label htmlFor="quick-professional-type">Professional category</label>
     <select id="quick-professional-type" name="type" defaultValue="">
      <option value="">All professional types</option>
      {options.professionals.types.map(type=><option key={type} value={type}>{type}</option>)}
     </select>
    </div>}
    <div className="vc-quick-field vc-quick-keyword">
     <label htmlFor="quick-keyword">{selected==="vet"?"Name or specialization":selected==="clinics"?"Clinic, service or species":selected==="professionals"?"Expertise, skills or name":selected==="marketplace"?"Product, brand or company":"Job title or company"}</label>
     <input id="quick-keyword" name="q" type="search" placeholder={selected==="clinics"?"e.g. Pet care, cattle":selected==="professionals"?"e.g. Nutrition, consultancy":selected==="marketplace"?"e.g. Vaccine, feed, supplier":"Optional keyword"}/>
    </div>
   </div>
   <button type="submit" className="button button-primary button-full">{current.cta} →</button>
  </form>
  <p className="vc-quick-disclaimer">{selected==="marketplace"?"Supplier city indicates business location, not stock availability.":selected==="professionals"?"Professional profiles and clinical practice services are listed separately.":"Searches use published, approved records; availability is not guaranteed."}</p>
 </div>;
}
