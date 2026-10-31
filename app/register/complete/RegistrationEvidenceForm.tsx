"use client";
import { useRef, useState, type ChangeEvent } from "react";
import FormMessage from "../../components/FormMessage";
import { createClient } from "@/lib/supabase/client";
import { REGISTRATION_EVIDENCE_BUCKET, isAcceptedEvidenceFile, isValidPakistaniCnic, type EvidenceRequirement } from "@/lib/registration-evidence";
import { completeRegistrationAction, saveRegistrationCnicAction, saveRegistrationEvidenceDraftAction } from "./actions";
type SavedEvidence = { document_type: string; original_filename: string; verification_status: string };
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "evidence";
export default function RegistrationEvidenceForm({ requirements, cnic = "", saved }: { requirements: EvidenceRequirement[]; cnic?: string; saved: SavedEvidence[] }) {
  const client = createClient();
  const required = [{type:"cnic_front",label:"CNIC front",imageOnly:false}, {type:"cnic_back",label:"CNIC back",imageOnly:false}, ...requirements];
  const initial = saved.reduce<Record<string,string>>((result,x)=>{ if(["draft","rejected"].includes(x.verification_status) && !result[x.document_type]) result[x.document_type]=x.original_filename; return result; },{});
  const [files, setFiles] = useState<Record<string,string>>(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [cnicSaved, setCnicSaved] = useState(isValidPakistaniCnic(cnic));
  const [savingCnic,setSavingCnic] = useState(false);
  const uploadInFlight=useRef(false);
  async function saveCnic(e: ChangeEvent<HTMLInputElement>) {
    const value=e.target.value;
    if(!/^[0-9]{5}-?[0-9]{7}-?[0-9]$/.test(value)) { setCnicSaved(false); return; }
    const d=new FormData(); d.set("cnic_number",value);
    setSavingCnic(true);setError("");
    try { await saveRegistrationCnicAction(d); setCnicSaved(true); }
    catch { setCnicSaved(false); setError("CNIC could not be saved. Please retry."); }
    finally {setSavingCnic(false);}
  }
  async function upload(type: string, file: File | undefined) {
    if (!file || uploadInFlight.current) return;
    if(!cnicSaved || savingCnic){setError("Save a valid CNIC number before uploading documents.");return;}
    if(!isAcceptedEvidenceFile(file.type,file.size,Boolean(required.find(item=>item.type===type)?.imageOnly))){
      setError("Choose a supported PDF or image up to 8 MB. Photos and logos must be JPG, PNG or WebP up to 5 MB.");return;
    }
    uploadInFlight.current=true;
    setBusy(type); setError("");
    try {
      const {data:auth,error:authError}=await client.auth.getUser();
      if(authError||!auth.user) throw new Error("Sign in again to continue your saved registration.");
      const path=auth.user.id+"/"+crypto.randomUUID()+"-"+safeName(file.name);
      const up=await client.storage.from(REGISTRATION_EVIDENCE_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
      if(up.error) throw new Error(up.error.message);
      const d=new FormData(); d.set("type",type); d.set("path",path); d.set("filename",file.name);
      await saveRegistrationEvidenceDraftAction(d);
      setFiles(prev=>({...prev,[type]:safeName(file.name)}));
    } catch(reason) { setError(reason instanceof Error?reason.message:"The private upload failed. Please retry."); }
    finally { uploadInFlight.current=false; setBusy(""); }
  }
  return <form action={completeRegistrationAction}>
    <FormMessage error={error}/>
    <div className="form-grid">
      <div><label htmlFor="cnic-number">CNIC number *</label><input id="cnic-number" name="cnic_number" disabled={Boolean(busy)||savingCnic} required inputMode="numeric" autoComplete="off" placeholder="12345-1234567-1" pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" maxLength={15} defaultValue={cnic} onChange={()=>setCnicSaved(false)} onBlur={saveCnic}/><small>{savingCnic?"Saving CNIC securely…":cnicSaved?"Saved securely to your account.":"Enter a valid CNIC; it will be saved when you leave this field."}</small></div>
      {required.map(item=><div key={item.type}><label htmlFor={item.type}>{item.label} *</label><input id={item.type} type="file" disabled={!cnicSaved || savingCnic || Boolean(busy)} accept={item.imageOnly?".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp":".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"} onChange={e=>{ const file=e.currentTarget.files?.[0];e.currentTarget.value="";void upload(item.type,file); }}/><small>{busy===item.type?"Uploading and saving securely…":files[item.type]?"Saved: "+files[item.type]:"Choose a file to save it to your private draft."}</small></div>)}
    </div>
    <p className="form-help">Each document is saved as soon as it uploads and remains private. You can sign out and resume later with the same email. Identity files are not attached to email notifications.</p>
    <button className="button button-primary button-full" type="submit" disabled={Boolean(busy)||savingCnic||!cnicSaved||required.some(x=>!files[x.type])}>{busy?"Saving securely…":"Submit for administrator review"}</button>
  </form>;
}