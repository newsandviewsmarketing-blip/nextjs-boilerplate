"use client";
import {useState} from "react";
import {CLINIC_SERVICES,CLINIC_SPECIES} from "@/lib/clinic-facility-options";

type Props={services?:string[];species?:string[]};
const SERVICE_GROUPS=[
 {id:"pet",title:"Pet & companion animal care",description:"Small-animal clinical care, diagnostics and preventive services",items:["Pet Medicine","Cat Medicine","Wellness Examination","Deworming & Parasite Control","Pet Dermatology","Pet Dentistry","Small Animal Internal Medicine","Diagnostic Imaging / Ultrasound","Pet Surgical Consultation","Behaviour & Welfare Advice","Bird & Exotic Pet Care"]},
 {id:"poultry",title:"Poultry & flock health",description:"Flock-level care, disease prevention and consultancy",items:["Poultry Health","Poultry Farm Consultancy","Flock Health Monitoring","Poultry Vaccination Planning","Poultry Disease Investigation","Feed & Flock Performance Review"]},
 {id:"livestock",title:"Livestock & farm practice",description:"Herd health, reproduction, nutrition and farm visits",items:["Livestock Herd Health","Mastitis & Udder Health","Herd Reproductive Health","Reproductive Services","Farm Visits","Farm Biosecurity Audit","Nutrition & Feed Advice"]},
 {id:"other",title:"General & specialized services",description:"Broader practice and referral options",items:["Consultation","Vaccination","Diagnostics","Surgery","Preventive Care","Emergency Care","Biosecurity","Aquaculture Health","Laboratory Referral"]},
] as const;
type Tab="pet"|"poultry"|"livestock"|"other"|"all";

function CheckboxCard({label,kind,checked}:{label:string;kind:"services"|"species";checked:boolean}){
 return <label className="vcx-clinic-focus-pill" key={label}>
  <input type="checkbox" name={kind+"_selected"} value={label} defaultChecked={checked}/>
  <span>{label}</span>
 </label>;
}
export default function ClinicFocusFields({services=[],species=[]}:Props){
 const [active,setActive]=useState<Tab>("pet");
 const knownServices=new Set<string>(CLINIC_SERVICES);
 const knownSpecies=new Set<string>(CLINIC_SPECIES);
 const extras={services:services.filter(x=>!knownServices.has(x)).join(", "),species:species.filter(x=>!knownSpecies.has(x)).join(", ")};
 return <div className="form-span-2 vcx-focus-sections vcx-clinic-specialty-panel">
  <div className="vcx-clinic-specialty-heading">
   <span className="section-kicker">PRACTICE FOCUS</span>
   <h3>Animals, services & clinical specialties</h3>
   <p>Start with the animal groups you serve, then choose the relevant services. Select only services your clinic can provide. This information stays in a private draft until review.</p>
  </div>
  <section className="vcx-clinic-choice-section" aria-labelledby="clinic-species-title">
   <div className="vcx-clinic-choice-title"><span className="vcx-clinic-choice-number">01</span><div><h4 id="clinic-species-title">Animals you care for</h4><p>Select one or more animal groups. You can change these later.</p></div></div>
   <fieldset className="vcx-clinic-focus">
    <legend className="vcx-visually-hidden">Animal groups and species served</legend>
    <div className="vcx-clinic-focus-grid">{CLINIC_SPECIES.map(label=><CheckboxCard key={label} label={label} kind="species" checked={species.includes(label)}/>)}</div>
    <label htmlFor="clinic_species_extra">Other species (optional)</label>
    <input id="clinic_species_extra" name="species_extra" defaultValue={extras.species} maxLength={350} placeholder="e.g. Camel, exotic pets"/>
   </fieldset>
  </section>
  <section className="vcx-clinic-choice-section" aria-labelledby="clinic-services-title">
   <div className="vcx-clinic-choice-title"><span className="vcx-clinic-choice-number">02</span><div><h4 id="clinic-services-title">Expertise & services</h4><p>Choose a practice focus to make the list easier to read. Selections in other categories remain saved.</p></div></div>
   <div className="vcx-clinic-service-tabs" role="group" aria-label="Filter service categories">
    {([{id:"pet",label:"Pets"},{id:"poultry",label:"Poultry"},{id:"livestock",label:"Livestock"},{id:"other",label:"General"},{id:"all",label:"All"}] as const).map(tab=>
     <button key={tab.id} type="button" onClick={()=>setActive(tab.id)} aria-pressed={active===tab.id} className={active===tab.id?"is-active":""}>{tab.label}</button>)}
   </div>
   <fieldset className="vcx-clinic-focus">
    <legend className="vcx-visually-hidden">Choose expertise and services</legend>
    {SERVICE_GROUPS.map(group=><div key={group.id} className="vcx-clinic-service-group" style={{display:active==="all"||active===group.id?"block":"none"}}>
      <h5>{group.title}</h5><p>{group.description}</p>
      <div className="vcx-clinic-focus-grid">{group.items.map(label=><CheckboxCard key={label} label={label} kind="services" checked={services.includes(label)}/>)}</div>
    </div>)}
    <label htmlFor="clinic_services_extra">Other expertise or service (optional)</label>
    <input id="clinic_services_extra" name="services_extra" defaultValue={extras.services} maxLength={350} placeholder="e.g. Equine field consultancy"/>
    <p className="form-help">Service selection does not verify a veterinary licence or enable appointments automatically. Fees, schedules and service availability are configured after saving.</p>
   </fieldset>
  </section>
 </div>;
}
