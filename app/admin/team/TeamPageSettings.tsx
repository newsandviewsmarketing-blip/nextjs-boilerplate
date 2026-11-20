"use client";
import {useState} from "react";
import FormSubmitButton from "@/app/components/FormSubmitButton";
import {validateSiteDocument,type SiteDocument} from "@/lib/site-content-document";
import {saveWebsiteDraftAction} from "@/app/admin/website/actions";
import styles from "@/app/admin/website/website.module.css";

export default function TeamPageSettings({initial,revision}:{initial:SiteDocument;revision:number}){
 const [doc,setDoc]=useState(initial);
 const [error,setError]=useState("");
 const update=(key:"title"|"summary"|"seoTitle"|"seoDescription"|"version",value:string)=>setDoc(prev=>({...prev,[key]:value}));
 return <div className={styles.editor}>
  <p>These fields control the public Team page heading, introduction and search results. Team member photographs, roles and biographies are managed above. Existing saved historical sections remain intact.</p>
  <form action={saveWebsiteDraftAction} noValidate onSubmit={event=>{
   try{validateSiteDocument(doc,"team");setError("");}catch(e){event.preventDefault();setError(e instanceof Error?e.message:"Please review the page details.");}
  }}>
    <input type="hidden" name="slug" value="team"/>
    <input type="hidden" name="revision" value={revision}/>
    <input type="hidden" name="document" value={JSON.stringify(doc)}/>
    <div className={styles.grid}>
      <label>Public page title<input value={doc.title} maxLength={200} onChange={e=>update("title",e.target.value)}/></label>
      <label>SEO title<input value={doc.seoTitle} maxLength={160} onChange={e=>update("seoTitle",e.target.value)}/></label>
    </div>
    <label>Public introduction<textarea rows={3} maxLength={1000} value={doc.summary} onChange={e=>update("summary",e.target.value)}/></label>
    <label>SEO description<textarea rows={3} maxLength={300} value={doc.seoDescription} onChange={e=>update("seoDescription",e.target.value)}/></label>
    <label>Content version<input value={doc.version} maxLength={80} onChange={e=>update("version",e.target.value)}/></label>
    {error&&<p role="alert" style={{color:"#b34720"}}>{error}</p>}
    <FormSubmitButton pendingLabel="Saving page draft..." className="button button-primary">Save page text draft</FormSubmitButton>
  </form>
 </div>;
}
