begin;
drop policy if exists career_documents_employer_selected_cv on public.career_documents;
create policy career_documents_employer_selected_cv on public.career_documents
for select to authenticated
using (exists(
 select 1 from public.job_applications a
 where a.cv_document_id=career_documents.id
 and public.can_manage_job_applicants(a.job_id)
));
commit;