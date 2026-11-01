'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireCareerAccount} from '@/lib/career-access';
export async function saveCoverLetter(form:FormData){
 const {identity,supabase}=await requireCareerAccount();
 const title=String(form.get('job_title')??'').trim(),company=String(form.get('company_name')??'').trim(),body=String(form.get('body_text')??'').trim();
 if(title.length>160||company.length>180||body.length<20||body.length>3000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(title+company+body))redirect('/career/cover-letter?error='+encodeURIComponent('Enter a letter of 20 to 3,000 characters and check the role and organization names.'));
 const {error}=await supabase.from('career_cover_letters').upsert({user_id:identity.userId,job_title:title||null,company_name:company||null,body_text:body,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)redirect('/career/cover-letter?error='+encodeURIComponent('Your letter could not be saved. Please retry.'));
 revalidatePath('/career/cover-letter');
 redirect('/career/cover-letter?message=Cover%20letter%20saved%20privately.');
}
