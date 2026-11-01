'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireCareerAccount} from '@/lib/career-access';
import {parseCareerPreferences} from '@/lib/career-preferences';
export async function saveCareerPreferences(form:FormData){
 const {identity,supabase}=await requireCareerAccount();
 let preferences;
 try{preferences=parseCareerPreferences(form);}catch(e){redirect('/career/preferences?error='+encodeURIComponent(e instanceof Error?e.message:'Check preferences.'));}
 const {error}=await supabase.from('candidate_preferences').upsert({professional_user_id:identity.userId,...preferences,updated_at:new Date().toISOString()},{onConflict:'professional_user_id'});
 if(error)redirect('/career/preferences?error='+encodeURIComponent('Preferences could not be saved. Please retry or contact support.'));
 revalidatePath('/career');revalidatePath('/career/preferences');
 redirect('/career?message='+encodeURIComponent(preferences.email_alerts?'Preferences saved. Matching emails start after your CV is complete and your profile is approved.':'Preferences saved. Job alert emails are switched off.'));
}
