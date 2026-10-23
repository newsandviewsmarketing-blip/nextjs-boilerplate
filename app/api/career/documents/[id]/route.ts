import {NextRequest,NextResponse} from "next/server";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentIdentity();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Not found"},{status:404});
 const supabase=await createClient();
 // RLS permits owner or employer ONLY where this CV is attached to their job application.
 const {data:cv,error}=await supabase.from("career_documents").select("file_path")
  .eq("id",id).eq("document_type","cv").maybeSingle();
 if(error||!cv)return NextResponse.json({error:"Not authorized"},{status:403});
 const {data,error:signedError}=await supabase.storage.from("career-documents")
  .createSignedUrl(cv.file_path,60);
 if(signedError||!data?.signedUrl)return NextResponse.json({error:"CV unavailable"},{status:404});
 const response=NextResponse.redirect(data.signedUrl,302);
 response.headers.set("Cache-Control","private, no-store");
 return response;
}