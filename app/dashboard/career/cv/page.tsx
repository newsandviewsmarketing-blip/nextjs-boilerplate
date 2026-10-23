import Link from "next/link";
import {redirect} from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {saveCareerCvBuilderAction} from "../actions";

export const dynamic="force-dynamic";
export default async function BuildCV({searchParams}:{
 searchParams:Promise<{error?:string;message?:string;print?:string}>
}){
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/dashboard/career/cv");
 const supabase=await createClient();
 const {data:cv}=await supabase.from("career_cv_profiles")
  .select("full_name,contact_email,phone,headline,education,experience,skills")
  .eq("user_id",identity.userId).maybeSingle();
 const params=await searchParams;
 return <main><SiteHeader/>
   <section className="page-hero cv-builder-hero"><div className="shell">
    <span className="section-kicker">MY VETCONNECT CV</span>
    <h1>Create your CV.</h1>
    <p>Save your professional information once, select this profile while applying for jobs, or print it as a PDF.</p>
   </div></section>
   <section className="section compact-section"><div className="shell cv-builder-layout">
    <div className="backend-form-card cv-editor">
     <h2>Edit saved CV</h2>
     {params.error&&<p className="form-message form-message-error">{params.error}</p>}
     {params.message&&<p className="form-message form-message-success">{params.message}</p>}
     <form className="profile-form" action={saveCareerCvBuilderAction}>
      <div><label htmlFor="cv-full-name">Full name *</label><input id="cv-full-name" name="full_name" required defaultValue={cv?.full_name??""}/></div>
      <div><label htmlFor="cv-email">Contact email</label><input id="cv-email" name="contact_email" type="email" defaultValue={cv?.contact_email??""}/></div>
      <div><label htmlFor="cv-phone">Phone</label><input id="cv-phone" name="phone" defaultValue={cv?.phone??""}/></div>
      <div><label htmlFor="cv-headline">Professional headline</label><input id="cv-headline" name="headline" defaultValue={cv?.headline??""}/></div>
      <div className="form-span-2"><label htmlFor="cv-education">Education / Qualifications</label><textarea id="cv-education" name="education" rows={4} defaultValue={cv?.education??""}/></div>
      <div className="form-span-2"><label htmlFor="cv-experience">Work experience</label><textarea id="cv-experience" name="experience" rows={5} defaultValue={cv?.experience??""}/></div>
      <div className="form-span-2"><label htmlFor="cv-skills">Skills and specialties</label><textarea id="cv-skills" name="skills" rows={4} defaultValue={cv?.skills??""}/></div>
      <button type="submit" className="button button-primary form-span-2">Save my CV</button>
     </form>
     <Link href="/dashboard/career">Back to saved CVs and applications</Link>
    </div>
    <aside className="backend-form-card cv-print-sheet">
     <span className="section-kicker">CV PREVIEW</span>
     {cv?<><h2>{cv.full_name}</h2><p>{cv.headline}</p>
       <p>{[cv.contact_email,cv.phone].filter(Boolean).join(" · ")}</p>
       {([["Education",cv.education],["Experience",cv.experience],["Skills",cv.skills]] as const)
        .filter(([,value])=>Boolean(value)).map(([heading,value])=>
          <section key={heading}><h3>{heading}</h3><p className="cv-preserve-lines">{value}</p></section>)}
     </>:<p>Save the CV form to create your personal preview.</p>}
     <div className="cv-print-actions">{cv&&<a href="/dashboard/career/cv/print" className="button button-secondary" target="_blank" rel="noopener noreferrer">Print or save as PDF</a>}</div>
    </aside>
   </div></section><SiteFooter/></main>;
}