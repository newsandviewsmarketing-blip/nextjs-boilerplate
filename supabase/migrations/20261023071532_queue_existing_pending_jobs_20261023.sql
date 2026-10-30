begin;
insert into public.admin_review_notifications(event_kind,entity_id,subject,detail)
select 'job_submitted',id,'Job needs review',left(title,200)
from public.jobs where verification_status='pending' and is_published=false
on conflict(event_kind,entity_id) do nothing;
commit;