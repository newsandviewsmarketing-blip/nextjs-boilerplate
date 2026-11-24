"use client";
import {useMemo,useRef,useState} from "react";
import Link from "next/link";
import JobPosterThumbnail from "./JobPosterThumbnail";

export type CurrentJobSlide={id:string;slug:string;title:string;sector:string;company_name:string;location:string;employment_type:string;image_available?:boolean};
export default function SectorJobSlider({jobs}:{jobs:CurrentJobSlide[]}){
 const [sector,setSector]=useState("All sectors");
 const track=useRef<HTMLDivElement>(null);
 const move=(direction:number)=>track.current?.scrollBy({left:direction*(track.current?.firstElementChild?.getBoundingClientRect().width??250)+direction*12,behavior:"smooth"});
 const sectors=useMemo(()=>[...new Set(jobs.map(j=>j.sector))].filter(x=>x!=="Other sectors"),[jobs]);
 const visible=useMemo(()=>sector==="All sectors"?jobs:jobs.filter(job=>job.sector===sector),[jobs,sector]);
 return <section aria-labelledby="current-jobs-title" className="current-jobs-panel vc-compact-jobs">
  <div className="vc-jobs-titlebar">
   <div>
    <h2 id="current-jobs-title">Latest Job Opportunities</h2>
    <p>Current published vacancies across veterinary and animal-health sectors.</p>
   </div>
   <Link href="/jobs" className="vc-jobs-view-all">All jobs →</Link>
  </div>
  {sectors.length>1&&<div className="job-sector-filters vc-home-sector-filters" aria-label="Filter jobs by sector">
   {["All sectors",...sectors].map(name=><button type="button" key={name}
    className={"job-sector-pill"+(sector===name?" active":"")} aria-pressed={sector===name}
    onClick={()=>{setSector(name);track.current?.scrollTo({left:0,behavior:"smooth"});}}>{name}</button>)}
  </div>}
  <div className="vc-jobs-scroll-controls">
   <span>Swipe to view more jobs</span>
   {visible.length>1&&<div className="vc-home-job-controls" aria-label="Browse job cards">
    <button type="button" onClick={()=>move(-1)} aria-label="Previous jobs">←</button>
    <button type="button" onClick={()=>move(1)} aria-label="Next jobs">→</button>
   </div>}
  </div>
  {visible.length===0?<div className="empty-state">No current vacancies in this sector. <Link href="/jobs">Explore all jobs</Link></div>:
   <div ref={track} className="current-jobs-track vc-home-job-track" role="region" aria-label="Jobs, swipe or scroll horizontally" tabIndex={0}>
    {visible.map(j=><article key={j.id} className="current-job-slide vc-home-job-card">
      <div className="vc-job-poster-frame"><JobPosterThumbnail id={j.id} slug={j.slug} title={j.title} company={j.company_name} available={Boolean(j.image_available)} compact /></div>
      {j.sector!=="Other sectors"&&<span className="module-tag">{j.sector}</span>}
      <h3>{j.title}</h3><p>{j.company_name}</p><p>{j.location} · {j.employment_type}</p>
      <Link className="button button-primary" href={"/jobs/"+j.slug}>View job →</Link>
    </article>)}
    <aside className="vc-job-action-card" aria-label="Career and recruitment actions">
      <span className="section-kicker">CAREERS & RECRUITMENT</span>
      <h3>Looking for talent or a new opportunity?</h3>
      <p>Build a career profile or publish a vacancy.</p>
      <Link href="/dashboard/career/cv" className="button button-primary">Create / Upload CV</Link>
      <Link href="/register?role=company#registration" className="button button-secondary">Post a Vacancy</Link>
    </aside>
   </div>}
 </section>;
}
