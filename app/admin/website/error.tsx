"use client";
export default function WebsiteEditorError({reset}:{reset:()=>void}) {
 return <section className="shell backend-form-card"><h1>Website content could not be updated</h1>
   <p>The draft may have changed or your permission may no longer be available. Reload the page before trying again.</p>
   <button type="button" className="button button-secondary" onClick={reset}>Try again</button>
   <p><a href="/admin/website">Reload saved drafts</a></p>
 </section>;
}
