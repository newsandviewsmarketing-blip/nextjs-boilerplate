import Script from "next/script";
import {guestApplicationReady,GUEST_CV_ACCEPT} from "@/lib/guest-job-applications";
import {submitGuestJobApplicationAction} from "@/app/jobs/guest-actions";
export default function GuestJobApply({jobId,slug}:{jobId:string;slug:string}){
 const enabled=guestApplicationReady();
 return <section className="guest-job-apply">
  <h3>Apply without creating an account</h3>
  <p>You can attach a CV directly. An email verification link confirms your application before the hiring team can see it.</p>
  {enabled?<>
   <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive"/>
   <form className="job-application-form" action={submitGuestJobApplicationAction} encType="multipart/form-data">
    <input type="hidden" name="slug" value={slug}/>
    <input type="hidden" name="job_id" value={jobId}/>
    <label htmlFor="guest_name">Full name *</label><input id="guest_name" name="applicant_name" required maxLength={120}/>
    <label htmlFor="guest_email">Email address *</label><input id="guest_email" type="email" name="applicant_email" required maxLength={254}/>
    <label htmlFor="guest_phone">Phone (optional)</label><input id="guest_phone" type="tel" name="applicant_phone" maxLength={40}/>
    <label htmlFor="guest_cv_file">Attach CV * (PDF, Word, JPG, PNG, max 5 MB)</label>
    <input id="guest_cv_file" type="file" name="guest_cv_file" accept={GUEST_CV_ACCEPT} required/>
    <label htmlFor="guest_note">Short note (optional)</label><textarea id="guest_note" name="cover_note" maxLength={2000}/>
    <label className="guest-consent"><input type="checkbox" required name="guest_cv_consent" value="yes"/>
     I agree that this CV and my contact information may be shared with the authorized hiring team for this application only.</label>
    <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}/>
    <button className="button button-primary" type="submit">Email verification and submit CV</button>
   </form>
  </>:<p className="form-help" role="status">Guest CV applications will become available after secure email delivery and spam protection are configured. Until then, please sign in and use a saved CV.</p>}
 </section>;
}
