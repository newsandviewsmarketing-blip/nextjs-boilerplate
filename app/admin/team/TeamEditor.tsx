"use client";
import {useEffect,useState} from "react";
import {saveTeamMember} from "./actions";
import {type TeamMember} from "@/lib/team-members";
import {TEAM_GROUPS} from "@/lib/team-groups";
import styles from "./team-admin.module.css";
const teamPhotoUrl=(path:string|null)=>{const base=process.env.NEXT_PUBLIC_SUPABASE_URL;return path&&base&&/^[a-f0-9-]{36}\\/[a-zA-Z0-9_.-]+$/.test(path)?base.replace(/\\/$/,"")+"/storage/v1/object/public/team-photos/"+path:null};

export default function TeamEditor({selected}:{selected?:TeamMember}){
 const [name,setName]=useState(selected?.full_name??"");
 const [title,setTitle]=useState(selected?.job_title??"");
 const [summary,setSummary]=useState(selected?.summary??"");
 const [photo,setPhoto]=useState<string|null>(teamPhotoUrl(selected?.photo_path??null));
 const [hasFile,setHasFile]=useState(Boolean(selected?.photo_path));
 const [order,setOrder]=useState(selected?.sort_order??100);
 const [group,setGroup]=useState(selected?.team_group??"team");
 const [photoY,setPhotoY]=useState(selected?.photo_position_y??30);
 const [publish,setPublish]=useState(selected?.is_published??false);
 const [bio,setBio]=useState(selected?.biography??"");
 const [tab,setTab]=useState<"identity"|"biography"|"links">("identity");
 const [validation,setValidation]=useState("");
 useEffect(()=>()=>{if(photo?.startsWith("blob:"))URL.revokeObjectURL(photo)},[photo]);
 const onPhoto=(file?:File)=>{
   if(!file)return;
   if(file.size>5242880||!["image/jpeg","image/png","image/webp"].includes(file.type)){alert("Choose a JPG, PNG or WebP under 5 MB.");return}
   setPhoto(URL.createObjectURL(file));setHasFile(true);
 };
 return <section className={styles.editor} id="team-editor">
  <div className={styles.editorHeader}>
   <div><span className={styles.eyebrow}>PROFILE EDITOR</span><h2>{selected?"Edit team profile":"Add team member"}</h2><p>Portrait, designation, professional history and SEO in one editor. Saving does not publish unless you approve publication below.</p></div>
   <span className={styles.status}>{publish?"Ready to publish":"Private draft"}</span>
  </div>
  <div className={styles.editorLayout}>
   <form id="team-member-form" action={saveTeamMember} encType="multipart/form-data" className={styles.editorForm} onSubmit={event=>{if(name.trim().length<2||title.trim().length<2){event.preventDefault();setTab("identity");setValidation("Enter the team member’s full name and designation.");return}if(publish&&(!hasFile||!summary.trim()||!bio.trim())){event.preventDefault();setTab(!hasFile?"identity":"biography");setValidation("An approved portrait, summary and full biography are required before publication.");return}setValidation("")}}>
    <input type="hidden" name="id" value={selected?.id??""}/>
    <div className={styles.tabs} role="group" aria-label="Edit profile sections">
     <button type="button" aria-pressed={tab==="identity"} onClick={()=>setTab("identity")}>01 Identity & photo</button>
     <button type="button" aria-pressed={tab==="biography"} onClick={()=>setTab("biography")}>02 Career & biography</button>
     <button type="button" aria-pressed={tab==="links"} onClick={()=>setTab("links")}>03 SEO & publication</button>
    </div>
    <div className={styles.tabBody} hidden={tab!=="identity"}>
     <h3>Basic identity</h3>
     <div className={styles.fields}>
      <label>Full name <em>*</em><input name="full_name" value={name} onChange={e=>setName(e.target.value)} maxLength={120} placeholder="Full professional name"/></label>
      <label>Designation <em>*</em><input name="job_title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="CEO, Chairman, Finance Director"/></label>
      <label>Section / seniority<select name="team_group" value={group} onChange={e=>setGroup(e.target.value)}>{TEAM_GROUPS.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select></label>
      <label>Order within section<input type="number" name="sort_order" min="0" max="99999" value={order} onChange={e=>setOrder(Number(e.target.value))}/></label>
      <label>Department<input name="department" maxLength={120} defaultValue={selected?.department??""} placeholder="Executive Office, Finance, Operations"/></label>
      <label>Profile URL slug <em>*</em><input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={selected?.slug??""} placeholder="full-name"/></label>
     </div>
     <div className={styles.photoUpload}>
      <label htmlFor="team-photo-upload">Professional portrait (JPG, PNG or WebP, up to 5 MB)</label>
      <input id="team-photo-upload" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={e=>onPhoto(e.target.files?.[0])}/>
      <p>Use the original approved photograph. The frame never alters the image file or facial features.</p>
      <label>Portrait focal point <input type="range" name="photo_position_y" min="0" max="100" value={photoY} onChange={e=>setPhotoY(Number(e.target.value))}/></label>
     </div>
    </div>
    <div className={styles.tabBody} hidden={tab!=="biography"}>
      <h3>Professional profile</h3>
      <label>Card introduction <span>Max 500 characters</span><textarea name="summary" maxLength={500} value={summary} onChange={e=>setSummary(e.target.value)} rows={4} placeholder="A concise factual introduction that appears below the designation."/></label>
      <label>Complete professional biography <span>Separate paragraphs with a blank line</span><textarea name="biography" rows={10} maxLength={8000} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Background, career milestones and contribution to VetConnect."/></label>
      <div className={styles.fields}>
       <label>Responsibilities & expertise<textarea name="expertise" rows={4} maxLength={1200} defaultValue={selected?.expertise??""}/></label>
       <label>Education & qualifications<textarea name="qualifications" rows={4} maxLength={1200} defaultValue={selected?.qualifications??""}/></label>
      </div>
    </div>
    <div className={styles.tabBody} hidden={tab!=="links"}>
      <h3>SEO and verified links</h3>
      <div className={styles.fields}>
       <label>SEO title<input name="seo_title" maxLength={160} defaultValue={selected?.seo_title??""} placeholder="Name | Designation | VetConnect"/></label>
       <label>LinkedIn URL<input type="url" name="linkedin_url" defaultValue={selected?.linkedin_url??""} placeholder="https://"/></label>
       <label>Website URL<input type="url" name="website_url" defaultValue={selected?.website_url??""} placeholder="https://"/></label>
       <label>Facebook URL<input type="url" name="facebook_url" defaultValue={selected?.facebook_url??""} placeholder="https://"/></label>
       <label>Public email (optional)<input name="email_public" type="email" defaultValue={selected?.email_public??""}/></label>
      </div>
      <label>SEO meta description<textarea name="seo_description" maxLength={300} defaultValue={selected?.seo_description??""} rows={3}/></label>
      <label className={styles.publishToggle}><input name="is_published" type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/> Publish approved team profile to public website</label>
      <p className={styles.help}>A photograph, summary and biography are required before publication. You can save incomplete profiles as private drafts.</p>
    </div>
    {validation&&<p role="alert" className={styles.help} style={{padding:"0 1.3rem",color:"#b34720"}}>{validation}</p>}
    <div className={styles.formFooter}>
      <button className="button button-primary" type="submit">Save {publish?"& publish":"private draft"}</button>
      <a className="button button-secondary" href="/admin/team">New member</a>
    </div>
    <p className={styles.help}>Your typed fields remain part of the form when switching tabs. Public visibility is controlled separately from administrator login roles.</p>
   </form>
   <aside className={styles.previewPane} aria-label="Team card preview">
    <div className={styles.previewHeader}><span>LIVE CARD PREVIEW</span><span>Desktop / mobile</span></div>
    <div className={styles.previewCard}>
      {photo?<img src={photo} alt="Preview of member portrait" className={styles.previewPortrait} style={{objectPosition:"center "+photoY+"%"}}/>:<div className={styles.photoPlaceholder}><span>PHOTO</span><strong>Upload professional portrait</strong><small>Same portrait ratio for every member</small></div>}
      <div className={styles.previewDetails}>
       <span className={styles.previewGroup}>{TEAM_GROUPS.find(g=>g.value===group)?.label??"Our Team"}</span>
       <h3>{name||"Member full name"}</h3>
       <strong>{title||"Professional designation"}</strong>
       <p>{summary||"A short introduction will appear here with three consistent lines of text."}</p>
       <span className={styles.previewRead}>Read full profile →</span>
      </div>
    </div>
    <div className={styles.previewNote}>The public page uses these card proportions, consistent photography and the section order set by the administrator. {hasFile?"Photo selected.":"No photo selected."}</div>
   </aside>
  </div>
 </section>;
}
