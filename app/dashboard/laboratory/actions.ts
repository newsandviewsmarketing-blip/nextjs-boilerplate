"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
function v(fd:FormData,k:string){return String(fd.get(k)??"").trim()}
export async function updateLaboratoryRequestStatusAction(fd:FormData){const identity=await getCurrentIdentity();if(!identity)redirect("/login?next=/dashboard/laboratory");const id=v(fd,"request_id"),labId=v(fd,"laboratory_id"),status=v(fd,"status");if(!["new","reviewing","responded","closed"].includes(status))redirect("/dashboard/laboratory?error=Invalid%20request%20status.");const supabase=await createClient();const {data:lab}=await supabase.from("laboratories").select("id").eq("id",labId).eq("owner_id",identity.userId).maybeSingle();if(!lab)redirect("/dashboard/laboratory?error=Laboratory%20access%20denied.");const {error}=await supabase.from("laboratory_information_requests").update({status}).eq("id",id).eq("laboratory_id",labId);if(error)redirect(`/dashboard/laboratory?error=${encodeURIComponent(error.message)}`);revalidatePath("/dashboard/laboratory");redirect("/dashboard/laboratory?message=Request%20status%20updated.")}
