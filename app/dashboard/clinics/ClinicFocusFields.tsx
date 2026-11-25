"use client";
import {useState} from "react";
import {CLINIC_SERVICES,CLINIC_SPECIES} from "@/lib/clinic-facility-options";

type Props={services?:string[];species?:string[]};
const SERVICE_GROUPS=[
 {id:"pet",title:"Pet & companion animal practice",description:"Choose consultation, diagnostics, treatment or specialist referral services",sections:[
  {title:"General & preventive pet care",items:["Pet Medicine","Cat Medicine","Wellness Examination","Deworming & Parasite Control","Behaviour & Welfare Advice","Pet Grooming / Hygiene Advice","Pet Microchipping","Bird & Exotic Pet Care"]},
  {title:"Pet diagnostics & laboratory",items:["Diagnostic Imaging / Ultrasound","Pet Ultrasound","Pet X-ray / Radiography","Pet ECG","Pet Echocardiography","In-house Blood Tests","Clinical Pathology / Laboratory","External Laboratory Referral"]},
  {title:"Pet treatments & clinical specialties",items:["Pet Dermatology","Pet Dentistry","Small Animal Internal Medicine","Pet Surgical Consultation","Pet Soft Tissue Surgery","Pet Spay / Neuter","Pet Ear Examination & Care","Pet Ophthalmology","Pet Orthopaedic Consultation","Pet Cardiology Consultation","Pet Neurology Consultation","Pet Physiotherapy / Rehabilitation"]},
 ]},
 {id:"poultry",title:"Poultry, breeder & hatchery practice",description:"Broiler, layer and breeder care with preventive flock health and management",sections:[
  {title:"Flock & production consultancy",items:["Poultry Health","Broiler Farm Health","Layer Farm Health","Breeder Flock Health","Poultry Farm Consultancy","Flock Health Monitoring","Broiler Growth Performance Monitoring","Layer Egg Production Monitoring","Feed & Flock Performance Review"]},
  {title:"Poultry disease, diagnostics & biosecurity",items:["Poultry Vaccination Planning","Poultry Disease Investigation","Poultry Necropsy & Sample Collection","Poultry Laboratory Testing","Hatchery Health & Hygiene"]},
 ]},
 {id:"livestock",title:"Livestock, dairy & farm practice",description:"Dairy, beef, farm herd health and reproductive support",sections:[
  {title:"Herd & farm health",items:["Livestock Herd Health","Dairy Herd Health","Beef Cattle Health","Mastitis & Udder Health","Farm Visits","Farm Biosecurity Audit","Nutrition & Feed Advice"]},
  {title:"Reproduction & diagnostics",items:["Herd Reproductive Health","Reproductive Services","Pregnancy Diagnosis","Artificial Insemination Services","Livestock Ultrasound","Livestock Laboratory Diagnostics"]},
 ]},
 {id:"equine",title:"Equine & field practice",description:"Horses and other equids, field visits and focused care",sections:[
  {title:"Equine services",items:["Equine General Practice","Equine Lameness Assessment","Equine Dentistry","Equine Ultrasound","Equine Reproductive Services"]},
 ]},
 {id:"aquaculture",title:"Aquaculture practice",description:"Services for fish and aquatic production",sections:[
  {title:"Aquatic animal health",items:["Aquaculture Health"]},
 ]},
 {id:"other",title:"General & shared services",description:"Only choose services actually available at this facility",sections:[
  {title:"General clinical services",items:["Consultation","Vaccination","Diagnostics","Surgery","Preventive Care","Emergency Care","Biosecurity","Laboratory Referral"]},
 ]},
] as const;
const ANIMAL_GROUPS=[
 {id:"pet",title:"Pets & companion animals",items:["Dogs","Cats","Rabbits","Pet Birds","Exotic Pets","Companion Animals"]},
 {id:"poultry",title:"Poultry production",items:["Poultry","Broiler Flocks","Layer Flocks","Breeder Flocks","Hatchery / Chicks"]},
 {id:"ruminants",title:"Small ruminants",items:["Sheep","Goats"]},
 {id:"livestock",title:"Dairy & beef",items:["Cattle","Buffalo","Dairy Cattle","Beef Cattle","Dairy Buffalo"]},
 {id:"equine",title:"Equine",items:["Equine","Horses","Donkeys"]},
 {id:"aquaculture",title:"Aquaculture",items:["Fish / Aquaculture"]},
 {id:"wildlife",title:"Wildlife",items:["Wildlife"]},
 {id:"other",title:"Other animals",items:["Camelids"]},
] as const;

function CheckboxCard({label,kind,checked,onChange}:{label:string;kind:"services"|"species";checked:boolean;onChange?:(checked:boolean)=>void}){
 return <label className="vcx-clinic-focus-pill" key={label}>
  <input type="checkbox" name={kind+"_selected"} value={label} defaultChecked={checked} onChange={event=>onChange?.(event.currentTarget.checked)}/>
  <span>{label}</span>
 </label>;
}
export default function ClinicFocusFields({services=[],species=[]}:Props){
 const [selectedSpecies,setSelectedSpecies]=useState(species);
 const visibleGroups = new Set(ANIMAL_GROUPS
  .filter(group=>group.items.some(label=>selectedSpecies.includes(label)))
  .map(group=>group.id));
 if (visibleGroups.has("ruminants")) visibleGroups.add("livestock");
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
    {ANIMAL_GROUPS.map(group=><details className="vcx-clinic-service-subgroup" key={group.title} open={group.items.some(label=>species.includes(label))}>
      <summary>{group.title}</summary>
      <div className="vcx-clinic-focus-grid">{group.items.map(label=><CheckboxCard key={label} label={label} kind="species" checked={species.includes(label)} onChange={checked=>setSelectedSpecies(previous=>checked?[...previous,label]:previous.filter(item=>item!==label))}/>)}</div>
    </details>)}
    <label htmlFor="clinic_species_extra">Other species (optional)</label>
    <input id="clinic_species_extra" name="species_extra" defaultValue={extras.species} maxLength={350} placeholder="e.g. Camel, exotic pets"/>
   </fieldset>
  </section>
  <section className="vcx-clinic-choice-section" aria-labelledby="clinic-services-title">
   <div className="vcx-clinic-choice-title"><span className="vcx-clinic-choice-number">02</span><div><h4 id="clinic-services-title">Expertise & services</h4><p>Service categories follow your animal selections. Existing service choices stay saved when you change the animals you serve.</p></div></div>
   <fieldset className="vcx-clinic-focus">
    <legend className="vcx-visually-hidden">Choose expertise and services</legend>
    {SERVICE_GROUPS.map(group=><div key={group.id} className="vcx-clinic-service-group" hidden={group.id!=="other"&&!visibleGroups.has(group.id)}>
      <h5>{group.title}</h5><p>{group.description}</p>
      {group.sections.map(section=><details className="vcx-clinic-service-subgroup" key={section.title}>
        <summary>{section.title}</summary>
        <div className="vcx-clinic-focus-grid">{section.items.map(label=><CheckboxCard key={label} label={label} kind="services" checked={services.includes(label)}/>)}</div>
      </details>)}
    </div>)}
    <label htmlFor="clinic_services_extra">Other expertise or service (optional)</label>
    <input id="clinic_services_extra" name="services_extra" defaultValue={extras.services} maxLength={350} placeholder="e.g. Equine field consultancy"/>
    <p className="form-help">Service selection does not verify a veterinary licence or enable appointments automatically. Fees, schedules and service availability are configured after saving.</p>
   </fieldset>
  </section>
 </div>;
}
