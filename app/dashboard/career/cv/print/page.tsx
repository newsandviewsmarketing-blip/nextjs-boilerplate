import VetConnectCvSheet from "@/app/components/VetConnectCvSheet";
import {careerPhoto} from "@/lib/career-photo";
import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import PrintButton from "./PrintButton";
export const dynamic="force-dynamic";
export default async function PrintableCv(){
 const user=await getCurrentIdentity();
 if(!user)redirect("/login?next=/career/cv/print");
 const s=await createClient();
 const {data:d}=await s.from("career_cv_profiles").select("full_name,contact_email,phone,headline,education,experience,skills,photo_path")
   .eq("user_id",user.userId).maybeSingle();
 const {data:profile}=await s.from("professional_profiles").select("image_url").eq("user_id",user.userId).maybeSingle();
 if(!d)redirect("/career/cv");
 const photoUrl=await careerPhoto(s,user.userId,d.photo_path,profile?.image_url);
 return <main className="cv-print-page"><PrintButton/><VetConnectCvSheet cv={d} photoUrl={photoUrl} location={[user.profile?.city,user.profile?.province].filter(Boolean).join(', ')}/></main>;
}
