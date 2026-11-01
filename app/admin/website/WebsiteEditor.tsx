"use client";
import { useState } from "react";
import { sourceSiteDocument, validateSiteDocument, type SiteDocument } from "@/lib/site-content-document";
import FormSubmitButton from "@/app/components/FormSubmitButton";
import { saveWebsiteDraftAction } from "./actions";
import styles from "./website.module.css";

export default function WebsiteEditor({initial,revision}:{initial:SiteDocument;revision:number}) {
  const [doc,setDoc] = useState(initial);
  const [preview,setPreview] = useState(false);
  const [error,setError] = useState("");
  function check() { try { validateSiteDocument(doc,doc.slug); setError(""); return true; } catch(e) { setError(e instanceof Error?e.message:"Check page fields."); return false; } }
  const setField = (key: "title"|"summary"|"version"|"effectiveDate"|"seoTitle"|"seoDescription", value:string) => setDoc(p=>({...p,[key]:value}));
  const setSection = (index:number, update:Partial<SiteDocument["sections"][number]>) => setDoc(p=>({...p,sections:p.sections.map((s,i)=>i===index?{...s,...update}:s)}));
  return <div className={styles.editor}>
    <div className={styles.actions}>
      <button type="button" className="button button-secondary" onClick={()=>{setDoc(sourceSiteDocument(doc.slug));setPreview(false);setError("");}}>Load latest website source</button>
      <button type="button" className="button button-secondary" onClick={()=>{if(check())setPreview(p=>!p);}}>{preview?"Edit fields":"Preview unsaved text"}</button>
    </div>
    <p>Loading source or previewing does not save or publish. Save the draft before using the separate publish control.</p>
    {error ? <p role="alert">{error}</p> : null}
    {preview ? <article className={styles.preview}><h2>{doc.title}</h2><p>{doc.summary}</p>
      {doc.sections.map((s,i)=><section key={i}><h3>{s.heading}</h3>{s.paragraphs.map((p,j)=><p key={j}>{p}</p>)}
        {s.links?.map((l,j)=><p key={j}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a></p>)}</section>)}</article> :
    <form action={saveWebsiteDraftAction} onSubmit={event=>{if(!check())event.preventDefault();}}>
      <input type="hidden" name="slug" value={doc.slug}/><input type="hidden" name="revision" value={revision}/>
      <input type="hidden" name="document" value={JSON.stringify(doc)}/>
      <div className={styles.grid}>
        <label>Page title<input value={doc.title} maxLength={200} required onChange={e=>setField("title",e.target.value)}/></label>
        <label>Version<input value={doc.version} maxLength={80} required onChange={e=>setField("version",e.target.value)}/></label>
        <label>Last updated date<input type="date" value={doc.effectiveDate} required onChange={e=>setField("effectiveDate",e.target.value)}/></label>
        <label>SEO title<input value={doc.seoTitle} maxLength={160} required onChange={e=>setField("seoTitle",e.target.value)}/></label>
      </div>
      <label>Page introduction<textarea value={doc.summary} rows={3} maxLength={1000} required onChange={e=>setField("summary",e.target.value)}/></label>
      <label>SEO description<textarea value={doc.seoDescription} rows={2} maxLength={300} required onChange={e=>setField("seoDescription",e.target.value)}/></label>
      {doc.sections.map((s,i)=><fieldset key={i}><legend>Section {i+1}</legend>
        <label>Heading<input value={s.heading} maxLength={200} required onChange={e=>setSection(i,{heading:e.target.value})}/></label>
        <label>Paragraphs (separate with a blank line)<textarea value={s.paragraphs.join("\n\n")} rows={6} required
          onChange={e=>setSection(i,{paragraphs:e.target.value.split(/\n\s*\n/)})}/></label>
        {(s.links??[]).map((l,j)=><div key={j} className={styles.linkRow}>
          <label>Link label<input value={l.label} maxLength={160} required onChange={e=>setSection(i,{links:s.links?.map((x,k)=>k===j?{...x,label:e.target.value}:x)})}/></label>
          <label>Public link URL<input value={l.href} maxLength={1000} required onChange={e=>setSection(i,{links:s.links?.map((x,k)=>k===j?{...x,href:e.target.value}:x)})}/></label>
          <button type="button" aria-label={"Remove link "+(j+1)+" in section "+(i+1)} onClick={()=>setSection(i,{links:s.links?.filter((_,k)=>k!==j)})}>Remove link</button>
        </div>)}
        <div className={styles.actions}>
          <button type="button" disabled={(s.links?.length??0)>=10} onClick={()=>setSection(i,{links:[...(s.links??[]),{label:"",href:""}]})}>Add link</button>
          <button type="button" disabled={doc.sections.length===1} onClick={()=>setDoc(p=>({...p,sections:p.sections.filter((_,k)=>k!==i)}))}>Remove section</button>
          <button type="button" disabled={i===0} onClick={()=>setDoc(p=>{const sections=[...p.sections];[sections[i-1],sections[i]]=[sections[i],sections[i-1]];return {...p,sections};})}>Move up</button>
        </div>
      </fieldset>)}
      <div className={styles.actions}>
        <button type="button" className="button button-secondary" disabled={doc.sections.length>=40}
          onClick={()=>setDoc(p=>({...p,sections:[...p.sections,{heading:"",paragraphs:[""]}]}))}>Add section</button>
        <FormSubmitButton pendingLabel="Saving draft..." className="button button-primary">Save private draft</FormSubmitButton>
      </div>
    </form>}
  </div>;
}
