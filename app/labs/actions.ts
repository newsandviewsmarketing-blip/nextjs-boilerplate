"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";

function v(fd:FormData,key:string){return String(fd.get(key)??"").trim()}
export async function requestLaboratoryInformationAction(fd:FormData){const laboratoryId=v(fd,"laboratory_id"),slug=v(fd,"slug"),name=v(fd,"contact_name"),message=v(fd,"message");if(!laboratoryId||!slug||!name||!message)redirect(`/labs/${encodeURIComponent(slug)}?error=Name%20and%20message%20are%20required.`);const identity=await getCurrentIdentity();const supabase=await createClient();const {error}=await supabase.from("laboratory_information_requests").insert({laboratory_id:laboratoryId,requester_id:identity?.userId??null,contact_name:name,contact_email:v(fd,"contact_email")||identity?.email||null,contact_phone:v(fd,"contact_phone")||null,organization:v(fd,"organization")||null,test_requested:v(fd,"test_requested")||null,sample_type:v(fd,"sample_type")||null,message});if(error)redirect(`/labs/${encodeURIComponent(slug)}?error=${encodeURIComponent(error.message)}`);redirect(`/labs/${encodeURIComponent(slug)}?message=Test%20information%20request%20sent.`)}
