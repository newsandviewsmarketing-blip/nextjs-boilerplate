import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import PrintButton from "./PrintButton";
export const dynamic="force-dynamic";
export default async function PrintableCv(){
 const user=await getCurrentIdentity();
 if(!user)redirect("/login?next=/dashboard/career/cv/print");
 const s=await createClient();
 const {data:d}=await s.from("career_cv_profiles").select("full_name,contact_email,phone,headline,education,experience,skills")
   .eq("user_id",user.userId).maybeSingle();
 if(!d)redirect("/dashboard/career/cv");
 return <main style={{fontFamily:"system-ui,sans-serif",maxWidth:760,margin:"40px auto",padding:24,color:"#122247"}}>
  <PrintButton/>
  <h1>{d.full_name}</h1><p>{d.headline}</p><p>{[d.contact_email,d.phone].filter(Boolean).join(" • ")}</p>
  {([["Education",d.education],["Experience",d.experience],["Skills",d.skills]] as const)
    .filter(([,body])=>Boolean(body)).map(([name,body])=><section key={name} style={{marginTop:25}}>
      <h2 style={{borderBottom:"1px solid #bbb",paddingBottom:6}}>{name}</h2>
      <p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{body}</p>
    </section>)}
 </main>;
}