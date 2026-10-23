"use client";
import {useEffect} from "react";
import Link from "next/link";
export type JobReceipt = {
 id:string;title:string;sector:string|null;company:string;employment_type:string;
 location:string;minimum_qualification:string|null;minimum_experience:number|null;
 deadline:string|null;description:string;verification_status:string;
};
export default function JobSubmissionReceipt({job,closeHref,storageKey,isAdmin}:{
 job:JobReceipt;closeHref:string;storageKey?:string;isAdmin?:boolean;
}){
 useEffect(()=>{if(storageKey)window.localStorage.removeItem(storageKey);},[storageKey]);
 return <div role="presentation" style={{position:"fixed",inset:0,zIndex:500,background:"rgba(7,18,46,.75)",display:"grid",placeItems:"center",padding:"16px"}}>
  <section role="dialog" aria-modal="true" aria-labelledby="submission-title"
    style={{background:"#fff",borderRadius:12,width:"min(95vw,660px)",maxHeight:"85vh",overflowY:"auto",padding:24,boxShadow:"0 20px 70px #0004"}}>
    <span className="section-kicker">SUBMISSION RECEIPT</span>
    <h2 id="submission-title">Job submitted for administrator review</h2>
    <p><strong>Status:</strong> Pending approval. This job has NOT been published.</p>
    <dl className="review-details">
      {([
        ["Job ID",job.id],["Employer",job.company],["Job title",job.title],
        ["Sector",job.sector||"Not specified"],["Employment type",job.employment_type],
        ["Recruitment location",job.location],
        ["Minimum qualification",job.minimum_qualification||"Not specified"],
        ["Minimum experience",job.minimum_experience===null?"Not specified":job.minimum_experience+" years"],
        ["Deadline",job.deadline||"Not specified"],
      ] as Array<[string,string]>).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
    <div><b>Description / requirements</b><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{job.description}</p></div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:22}}>
      {isAdmin && <Link className="button button-primary" href={"/admin/reviews#job-"+job.id}>Review in admin queue →</Link>}
      <Link className="button button-secondary" href={closeHref}>Close and continue</Link>
    </div>
    {!isAdmin && <p className="form-help">An authorized VetConnect administrator must approve this submission before it becomes publicly visible.</p>}
  </section>
 </div>
}
