-- 站長（網站持有者）專用的會員統計。
-- 只有 teacher_access.is_site_owner = true 的帳號能呼叫；一般教師、網站管理者（can_manage_accounts）都不行。
-- 指定站長請另外執行：update public.teacher_access set is_site_owner = true where id = '<站長的 user id>';
begin;
alter table public.teacher_access add column if not exists is_site_owner boolean not null default false;

create or replace function public.owner_site_stats()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.teacher_access t where t.id = auth.uid() and t.active and t.is_site_owner) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  with base as (
    select s.id, s.teaching_group, u.last_sign_in_at,
      exists(select 1 from public.assessment_results r where r.user_id = s.id) as explored,
      (select count(*) from public.tracking_items t where t.user_id = s.id and t.removed_at is null) as tracking
    from public.students s join auth.users u on u.id = s.id
    where s.active
  )
  select jsonb_build_object(
    'generated_at', now(),
    'totals', (select jsonb_build_object(
      'students', count(*),
      'signed_in', count(*) filter (where last_sign_in_at is not null),
      'active_7d', count(*) filter (where last_sign_in_at > now() - interval '7 days'),
      'active_30d', count(*) filter (where last_sign_in_at > now() - interval '30 days'),
      'explored', count(*) filter (where explored),
      'tracking_users', count(*) filter (where tracking > 0),
      'tracking_items', coalesce(sum(tracking), 0)) from base),
    'groups', coalesce((select jsonb_agg(g order by g->>'group') from (
      select jsonb_build_object('group', teaching_group,
        'students', count(*),
        'signed_in', count(*) filter (where last_sign_in_at is not null),
        'explored', count(*) filter (where explored),
        'tracking_users', count(*) filter (where tracking > 0)) as g
      from base group by teaching_group) x), '[]'::jsonb),
    'top_departments', coalesce((select jsonb_agg(d) from (
      select jsonb_build_object('school', t.school_name, 'department', t.department_name, 'students', count(distinct t.user_id)) as d
      from public.tracking_items t join public.students s on s.id = t.user_id and s.active
      where t.removed_at is null
      group by t.school_name, t.department_name
      order by count(distinct t.user_id) desc, t.school_name, t.department_name
      limit 15) y), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.owner_site_stats() from public, anon;
grant execute on function public.owner_site_stats() to authenticated;

do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations(version,name) values('20261102120000','site_owner_stats') on conflict do nothing;
  end if;
end $$;
commit;
