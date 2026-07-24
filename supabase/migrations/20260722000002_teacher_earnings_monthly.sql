-- Ganancias del profesor = fees de clases del mes en curso (no todo el plan)

create or replace view public.teacher_summaries
with (security_invoker = true) as
select
  t.id,
  t.user_id,
  t.name,
  t.email,
  t.avatar_url,
  t.specialty,
  t.phone,
  t.is_active,
  count(distinct s.id)::integer as students_count,
  coalesce(
    (
      select sum(c.teacher_fee)
      from public.class_sessions c
      where c.teacher_id = t.id
        and c.status <> 'cancelled'
        and c.class_date >= date_trunc('month', current_date)::date
        and c.class_date < (date_trunc('month', current_date) + interval '1 month')::date
    ),
    0
  )::numeric(10, 2) as earnings,
  t.created_at,
  t.updated_at
from public.teachers t
left join public.students s on s.teacher_id = t.id
group by t.id;
