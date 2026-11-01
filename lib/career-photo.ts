import type {SupabaseClient} from '@supabase/supabase-js';
/** Only the signed-in owner's photograph is read; identity documents are never selected. */
export async function careerPhoto(db:SupabaseClient,userId:string,cvPath?:string|null,professionalUrl?:string|null){
 if(cvPath){const {data}=await db.storage.from('career-cv-photos').createSignedUrl(cvPath,900);if(data?.signedUrl)return data.signedUrl;}
 if(professionalUrl)return professionalUrl;
 const {data:evidence}=await db.from('registration_evidence').select('storage_path').eq('user_id',userId).eq('document_type','profile_photo').order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(!evidence?.storage_path)return null;
 const {data}=await db.storage.from('registration-evidence').createSignedUrl(evidence.storage_path,900);
 return data?.signedUrl??null;
}
