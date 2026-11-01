'use client';
import {useState} from 'react';
import {saveCoverLetter} from './actions';
export default function LetterEditor({name,initial,disabled}:{name:string;initial:{job_title?:string|null;company_name?:string|null;body_text?:string|null}|null;disabled:boolean}){
 const [role,setRole]=useState(initial?.job_title??''),[company,setCompany]=useState(initial?.company_name??''),[body,setBody]=useState(initial?.body_text??'');
 function generate(){
  if(body.trim()&&!window.confirm('Replace the current letter text with a starter draft?'))return;
  setBody(`Dear Hiring Manager,\n\nI would like to be considered for ${role.trim()||'a suitable job or internship'}${company.trim()?' at '+company.trim():''}. My attached CV provides details of my education, experience and skills.\n\nI would welcome the opportunity to discuss how my background and interests relate to your requirements. Please contact me using the details in my CV.\n\nThank you for considering my application.\n\nYours sincerely,\n${name}`);
 }
 return <form className="profile-form" action={saveCoverLetter}><div><label htmlFor="letter-role">Job / internship title (optional)</label><input id="letter-role" name="job_title" maxLength={160} value={role} onChange={e=>setRole(e.target.value)}/></div><div><label htmlFor="letter-company">Organization (optional)</label><input id="letter-company" name="company_name" maxLength={180} value={company} onChange={e=>setCompany(e.target.value)}/></div><button type="button" className="button button-secondary" onClick={generate}>Create a starter draft</button><p>This optional starter makes no claims about your qualifications. Edit it for the employer, explain your relevant interests and review it before saving.</p><div className="form-span-2"><label htmlFor="letter-body">Cover letter</label><textarea id="letter-body" name="body_text" required minLength={20} maxLength={3000} rows={14} value={body} onChange={e=>setBody(e.target.value)}/><p className="form-help">{body.length} / 3,000 characters. Keep sensitive identity numbers out of your letter.</p></div><button disabled={disabled} type="submit" className="button button-primary">Save cover letter privately</button></form>;
}
