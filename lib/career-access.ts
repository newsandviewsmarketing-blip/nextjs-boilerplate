import {redirect} from 'next/navigation';
import {getCurrentIdentity} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
export async function requireCareerAccount(){
 const identity=await getCurrentIdentity();
 if(!identity)redirect('/login?next=/career');
 if(!identity.roles.some(r=>['candidate','professional','veterinarian'].includes(r)))redirect('/dashboard?error=Career%20account%20required.');
 const supabase=await createClient();
 const {data,error}=await supabase.auth.getUser();
 if(error||!data.user||data.user.id!==identity.userId)redirect('/login?next=/career');
 if(!data.user.email_confirmed_at)redirect('/verify-email');
 return {identity,supabase};
}
