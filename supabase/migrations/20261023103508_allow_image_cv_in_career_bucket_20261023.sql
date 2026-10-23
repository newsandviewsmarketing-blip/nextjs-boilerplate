begin;
update storage.buckets
set allowed_mime_types = array[
 'application/pdf','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'image/jpeg','image/png'
]
where id='career-documents';
-- Keep original 10 MB bucket limit for existing non-CV documents.
-- All new Career Workspace CV uploads are restricted to 5 MB in server actions.
commit;