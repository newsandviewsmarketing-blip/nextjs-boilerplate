"use client";

import {useState} from "react";

type SearchCategory="clinics"|"vets"|"products"|"jobs";
const tabs:{id:SearchCategory;label:string;title:string;action:string}[]=[
 {id:"clinics",label:"Clinics",title:"Find a clinic",action:"/clinics"},
 {id:"vets",label:"Veterinarians",title:"Find a veterinarian",action:"/vets"},
 {id:"products",label:"Products",title:"Find animal-health products",action:"/marketplace"},
 {id:"jobs",label:"Jobs",title:"Find a job",action:"/jobs"},
];
const cities=["Faisalabad","Lahore","Islamabad","Rawalpindi","Multan"];
export default function HomeQuickSearch(){
 const [active,setActive]=useState<SearchCategory>("clinics");
 const chosen=tabs.find(t=>t.id===active)!;
 return <div className="hero-search-card vc-quick-search">
  <div className="search-card-head"><div><small>QUICK SEARCH</small><h2 id="quick-search-title">{chosen.title}</h2></div></div>
  <div className="vc-quick-tabs" aria-label="Choose search category">
   {tabs.map(tab=><button type="button" key={tab.id} aria-pressed={active===tab.id} className={active===tab.id?"is-active":""}
     onClick={()=>setActive(tab.id)}>{tab.label}</button>)}
  </div>
  <form key={active} action={chosen.action} method="get" aria-labelledby="quick-search-title">
   {(active==="clinics"||active==="vets")&&<>
    <label htmlFor="home-search-city">City</label>
    <select id="home-search-city" name="city" defaultValue=""><option value="">All cities</option>
      {cities.map(city=><option key={city} value={city}>{city}</option>)}
    </select>
   </>}
   {active==="vets"&&<>
    <label htmlFor="home-search-sector">Animal / sector</label>
    <select id="home-search-sector" name="sector" defaultValue=""><option value="">All sectors</option>
      {["Livestock","Dairy","Poultry","Pets","Fisheries","Equine"].map(s=><option key={s} value={s}>{s}</option>)}
    </select>
   </>}
   {active==="clinics"&&<>
    <label htmlFor="home-search-clinic">Clinic, service or species</label>
    <input id="home-search-clinic" name="q" type="search" placeholder="e.g. dairy farm, pet clinic"/>
   </>}
   {active==="products"&&<>
    <label htmlFor="home-search-product">Product or company</label>
    <input id="home-search-product" name="q" type="search" placeholder="Medicine, feed, vaccine, brand"/>
   </>}
   {active==="jobs"&&<>
    <label htmlFor="home-search-job">Job title, company or sector</label>
    <input id="home-search-job" name="q" type="search" placeholder="e.g. Poultry, DVM, Sales"/>
   </>}
   <button type="submit" className="button button-primary button-full">
    {active==="clinics"?"Search clinics":active==="vets"?"Search veterinarians":active==="products"?"Browse products":"Find jobs"} →
   </button>
  </form>
 </div>;
}
