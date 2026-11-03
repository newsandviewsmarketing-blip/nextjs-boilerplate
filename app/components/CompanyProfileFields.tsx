"use client";

import { useRef, useState } from "react";
import PakistanLocationFields from "./PakistanLocationFields";
import CompanyStory from "./CompanyStory";
import type { ManagementContact } from "@/lib/company-profile-editor";
import "./CompanyProfileFields.css";

type Mode = "admin-create" | "admin-edit" | "company-edit";
type Props = {
  mode: Mode;
  initial?: Record<string, unknown> | null;
  presentation?: Record<string, unknown> | null;
  contacts?: ManagementContact[];
};
const emptyContact: ManagementContact = {
  full_name:"", designation:"", department:"", office_phone:"",
  mobile_phone:"", email:"", reports_to:"", notes:"",
};
const contactFields: Array<{ key:keyof ManagementContact; label:string; placeholder?:string }> = [
  {key:"full_name",label:"Full name",placeholder:"Muhammad Aslam"},
  {key:"designation",label:"Designation",placeholder:"Chief Executive Officer"},
  {key:"department",label:"Department / role",placeholder:"Operations, Accounts, Sales"},
  {key:"office_phone",label:"Office telephone"},
  {key:"mobile_phone",label:"Mobile number"},
  {key:"email",label:"Private email"},
  {key:"reports_to",label:"Reports to (name)",placeholder:"Managing Director"},
  {key:"notes",label:"Responsibilities / internal notes"},
];

export default function CompanyProfileFields({mode,initial,presentation,contacts:initialContacts=[]}:Props) {
  const isCreate = mode === "admin-create";
  const isAdmin = mode !== "company-edit";
  const data = initial ?? {};
  const extra = presentation ?? {};
  const get = (key: string) => String(data[key] ?? "");
  const getExtra = (key: string) => String(extra[key] ?? "");
  const [description,setDescription] = useState(get("description"));
  const [tone,setTone] = useState(getExtra("profile_tone") || "navy");
  const [contacts,setContacts] = useState<ManagementContact[]>(initialContacts);
  const [preview,setPreview] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function addFormatting(before:string,after="",fallback="text") {
    const textArea = textRef.current;
    if (!textArea) return;
    const a=textArea.selectionStart,b=textArea.selectionEnd;
    const selection=description.slice(a,b) || fallback;
    const next=description.slice(0,a)+before+selection+after+description.slice(b);
    if (next.length>6000) return;
    setDescription(next);
    requestAnimationFrame(() => {
      textArea.focus();
      textArea.setSelectionRange(a+before.length,a+before.length+selection.length);
    });
  }
  function updateContact(index:number,key:keyof ManagementContact,value:string) {
    setContacts(previous => previous.map((item,i)=>i===index?{...item,[key]:value}:item));
  }

  return <div className="vc-company-editor">
    <header className="vc-company-editor-intro">
      <span className="vc-company-editor-intro-icon" aria-hidden="true">▣</span>
      <div><span className="section-kicker">COMPANY PROFILE STUDIO</span>
        <h2>{isCreate?"Create a Complete Company Profile":"Edit your Complete Company Profile"}</h2>
        <p>One company identity for VetConnect, with polished public details, social links and protected internal management records. Your company profile can also be prepared for print or PDF.</p>
      </div>
    </header>

    <section className="vc-company-section">
      <div className="vc-company-section-heading"><span className="vc-company-heading-icon" aria-hidden="true">▦</span>
        <div><h3>Company information</h3><p>Official organization details. Do not repeat owner information in the public description.</p></div>
      </div>
      <div className="vc-company-editor-grid">
        <div><label htmlFor="vc-company-name">Company name *</label><input id="vc-company-name" name={isCreate?"canonical_name":mode==="company-edit"?"company_name":"canonical_name"} required maxLength={180} defaultValue={get("canonical_name") || get("company_name")}/></div>
        <div><label htmlFor="vc-business-type">Business type</label><input id="vc-business-type" name="business_type" maxLength={150} defaultValue={get("business_type")} placeholder="Veterinary pharmaceuticals, Feed, Dairy..."/></div>
        <div><label htmlFor="vc-legal-name">Legal name</label><input id="vc-legal-name" name="legal_name" maxLength={180} defaultValue={get("legal_name")}/></div>
        <div><label htmlFor="vc-trade-name">Trade name / brand</label><input id="vc-trade-name" name="trade_name" maxLength={180} defaultValue={get("trade_name")}/></div>
        <div><label htmlFor="vc-reg-number">Company registration / NTN number</label><input id="vc-reg-number" name="registration_number" maxLength={100} defaultValue={get("registration_number")}/></div>
        <div><label htmlFor="vc-founded">Year established</label><input id="vc-founded" name="year_established" type="number" min="1800" max={new Date().getFullYear()} defaultValue={getExtra("year_established") || get("year_established")}/></div>
        <div><label htmlFor="vc-public-email">Public email</label><input id="vc-public-email" name={mode==="company-edit"?"contact_email":"public_email"} type="email" maxLength={240} defaultValue={get("public_email") || get("contact_email")}/></div>
        <div><label htmlFor="vc-public-phone">Public telephone</label><input id="vc-public-phone" name="public_phone" type="tel" maxLength={60} defaultValue={get("public_phone")}/></div>
        <PakistanLocationFields defaultProvince={get("province")} defaultDistrict={get("district")} defaultTehsil={get("tehsil")} defaultCity={get("city")}/>
        <div className="vc-company-wide"><label htmlFor="vc-address">Registered / office address</label><input id="vc-address" name="address" maxLength={600} defaultValue={get("address")}/></div>
        <div><label htmlFor="vc-maps">Google Maps URL</label><input id="vc-maps" name="google_maps_url" type="url" maxLength={512} defaultValue={get("google_maps_url")}/></div>
        <div><label htmlFor="vc-logo-url">Company logo URL</label><input id="vc-logo-url" name="logo_url" type="url" maxLength={512} defaultValue={get("logo_url")}/></div>
        <div><label htmlFor="vc-logo-upload">Upload company logo (optional)</label><input id="vc-logo-upload" type="file" name="logo_file" accept="image/jpeg,image/png,image/webp"/><small>JPG, PNG or WebP, up to 5 MB. Overrides the URL when uploaded.</small></div>
        <div><label htmlFor="vc-cover">Cover image URL</label><input id="vc-cover" name="cover_image_url" type="url" maxLength={512} defaultValue={get("cover_image_url")}/></div>
        {isAdmin && <div><label htmlFor="vc-reg-evidence">Private registration / NTN evidence</label><input id="vc-reg-evidence" type="file" name="supporting_document" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"/><small>Private evidence, never shown on the public page.</small></div>}
      </div>
    </section>

    <section className="vc-company-section">
      <div className="vc-company-section-heading"><span className="vc-company-heading-icon" aria-hidden="true">↗</span><div><h3>Social & online presence</h3><p>Use only the company’s official website and verified social accounts.</p></div></div>
      <div className="vc-company-editor-grid vc-company-social-grid">
        <div><label htmlFor="vc-website">Website</label><input id="vc-website" name="website" type="url" maxLength={512} defaultValue={get("website")} placeholder="https://example.com"/></div>
        {([["facebook_url","Facebook"],["instagram_url","Instagram"],["linkedin_url","LinkedIn"],["youtube_url","YouTube"],["other_url","Other official link (X, WhatsApp, etc.)"]] as const).map(([key,label])=><div key={key}><label htmlFor={"vc-"+key}>{label}</label><input id={"vc-"+key} name={key} type="url" maxLength={512} defaultValue={getExtra(key)} placeholder="https://"/></div>)}
      </div>
    </section>

    <section className="vc-company-section vc-company-story-editor">
      <div className="vc-company-section-heading"><span className="vc-company-heading-icon" aria-hidden="true">▤</span><div><h3>Company introduction & description</h3><p>Use headings, bold text and bullet points to create a professional public profile and print layout.</p></div></div>
      <div className="vc-company-editor-grid">
        <div className="vc-company-wide"><label htmlFor="vc-tagline">Introduction / one-line summary</label><input id="vc-tagline" name="tagline" maxLength={240} defaultValue={getExtra("tagline")} placeholder="A concise introduction to the company and its work"/></div>
        <div><label htmlFor="vc-tone">Profile colour style</label><select id="vc-tone" name="profile_tone" value={tone} onChange={event=>setTone(event.target.value)}><option value="navy">VetConnect navy</option><option value="orange">VetConnect orange</option><option value="slate">Neutral slate</option></select></div>
        <div className="vc-company-wide">
          <div className="vc-editor-toolbar" aria-label="Company description formatting">
            <button type="button" title="Heading" onClick={()=>addFormatting("## ","","Heading")}>H</button>
            <button type="button" title="Bold" onClick={()=>addFormatting("**","**","bold text")}><strong>B</strong></button>
            <button type="button" title="Italic" onClick={()=>addFormatting("*","*","italic text")}><em>I</em></button>
            <button type="button" title="Bullet list" onClick={()=>addFormatting("- ","","Service or achievement")}>• List</button>
            <button type="button" aria-pressed={preview} onClick={()=>setPreview(v=>!v)}>{preview?"Edit":"Preview"}</button>
            <span>{description.length}/6000</span>
          </div>
          <textarea ref={textRef} id="vc-description" name="description" rows={8} maxLength={6000} value={description} onChange={event=>setDescription(event.target.value)} aria-label="Company description" placeholder="Company background, mission, products, services, facilities and important achievements." style={{display:preview?"none":undefined}}/>
          {preview && <div className="vc-company-preview" aria-label="Formatted company description preview"><CompanyStory text={description} tone={tone}/></div>}
          <small>Formatting is stored as safe text, not executable HTML. Only approved public company records are shown in the directory.</small>
        </div>
      </div>
    </section>

    <section className="vc-company-section vc-company-private-section">
      <div className="vc-company-section-heading"><span className="vc-company-heading-icon" aria-hidden="true">♙</span><div><h3>Private management hierarchy</h3><p>Owner, CEO, directors, managers and internal contacts. These cards are never included in public profiles.</p></div><span className="vc-company-private-badge">INTERNAL ONLY</span></div>
      <p className="vc-company-privacy-note">Private contact cards do not grant account access or change company membership permissions. Internal PDF exports require authorized access.</p>
      <input type="hidden" name="private_contacts_json" value={JSON.stringify(contacts)}/>
      {contacts.map((person,index)=><div className="vc-management-card" key={index}>
        <div className="vc-management-card-head"><strong>{index+1}. {person.full_name || "New contact"}</strong><span>{person.designation || (index===0?"Owner / primary contact":"Team member")}</span><button type="button" aria-label={"Remove contact "+(index+1)} onClick={()=>setContacts(old=>old.filter((_,i)=>i!==index))}>Remove</button></div>
        <div className="vc-company-editor-grid">{contactFields.map(({key,label,placeholder})=><div key={key} className={key==="notes"?"vc-company-wide":undefined}>
          <label htmlFor={"vc-contact-"+index+"-"+key}>{label}{key==="full_name"?" *":""}</label>
          {key==="notes"?<textarea id={"vc-contact-"+index+"-"+key} rows={2} value={person[key]} onChange={event=>updateContact(index,key,event.target.value)} maxLength={1500} placeholder="Responsibilities, seniority and notes"/>:
           <input id={"vc-contact-"+index+"-"+key} type={key==="email"?"email":key==="mobile_phone"||key==="office_phone"?"tel":"text"} value={person[key]} maxLength={key==="email"?240:150} onChange={event=>updateContact(index,key,event.target.value)} placeholder={placeholder}/>}
        </div>)}</div>
      </div>)}
      <button className="button button-secondary vc-add-contact" type="button" disabled={contacts.length>=30} onClick={()=>setContacts(old=>[...old,{...emptyContact}])}>+ Add an internal contact</button>
    </section>
  </div>;
}
