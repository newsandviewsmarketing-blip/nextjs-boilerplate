"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
export type CurrentJobSlide={id:string;slug:string;title:string;sector:string;company_name:string;location:string;employment_type:string};
export default function SectorJobSlider({jobs}:{jobs:CurrentJobSlide[]}){
 const [sector,setSector]=useState("All sectors");
 const sectors=useMemo(()=>["All sectors",...new Set(jobs.map(j=>j.sector))],[jobs]);
 const current=useMemo(()=>sector==="All sectors"?jobs:jobs.filter(j=>j.sector===sector),[jobs,sector]);
 return <section aria-labelledby="current-jobs-title" className="current-jobs-panel">
  <div className="section-heading compact-heading">
   <span className="section-kicker">LATEST VERIFIED OPENINGS</span>
   <h2 id="current-jobs-title">10 latest job opportunities</h2>
   <p>The newest approved and published vacancies are shown first. Browse by sector below.</p>
  </div>
  {current.length===0?<div className="empty-state">No verified active jobs are currently available in this sector.</div>:
   <div className="current-jobs-track" role="region" aria-label="Current jobs, scroll horizontally">
    {current.map(j=><article key={j.id} className="current-job-slide">
      <span className="module-tag">{j.sector}</span>
      <h3>{j.title}</h3>
      <p>{j.company_name}</p>
      <p>{j.location} · {j.employment_type}</p>
      <Link className="button button-primary" href={"/jobs/"+j.slug}>View job & apply →</Link>
     </article>)}
   </div>}
  <div className="section-heading compact-heading"><h3>Browse by sector</h3><p>Explore Poultry, Dairy, Livestock, Sales &amp; Marketing and other fields.</p></div>
  <div className="job-sector-filters" aria-label="Filter open jobs by sector">
   {sectors.map(name=><button type="button" key={name}
     className={"job-sector-pill"+(sector===name?" active":"")}
     aria-pressed={sector===name} onClick={()=>setSector(name)}>{name}</button>)}
  </div>

  <div className="current-jobs-footer"><Link href={sector==="All sectors"?"/jobs":"/jobs?sector="+encodeURIComponent(sector)+"#jobs"}>Browse all {sector==="All sectors"?"available":sector} jobs →</Link></div>
 </section>;
}