import type {SupabaseClient} from "@supabase/supabase-js";

/** Match the typed email to the verified identity from Supabase Auth, not form data. */
export async function matchingVerifiedAccountEmail(supabase:SupabaseClient,expectedUserId:string,typedEmail:string):Promise<boolean>{
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user||user.id!==expectedUserId||!user.email_confirmed_at||!user.email)return false;
 const submitted=typedEmail.trim().toLowerCase();
 return submitted.length>0&&submitted.length<=254&&submitted===user.email.trim().toLowerCase();
}
