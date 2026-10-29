-- Teacher roster overview: one call returns login light, tracking count and exploration status per visible student.
begin;

-- A new attempt replaces any earlier unfinished one, so a student never stays "in progress" forever.
create or replace function public.portal_begin(owner_id uuid, attempt_key uuid, bank_value text, scoring_value text, source_value text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.students where id=owner_id and active) then raise sqlstate 'PT403' using message='STUDENT_DISABLED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('attempt:'||owner_id::text,0));
  if exists(select 1 from public.assessment_attempts where id=attempt_key and user_id<>owner_id) then raise sqlstate 'PT403' using message='FORBIDDEN'; end if;
  if not exists(select 1 from public.assessment_attempts where id=attempt_key) then
    if (select count(*) from public.assessment_attempts where user_id=owner_id and started_at>now()-interval '1 day')>=30
      then raise sqlstate 'PT429' using message='DAILY_ATTEMPT_LIMIT'; end if;
    update public.assessment_attempts set status='abandoned'
      where user_id=owner_id and status='in_progress' and id<>attempt_key;
  end if;
  insert into public.assessment_attempts(id,user_id,teaching_group_at_test,original_class_at_test,bank_version,scoring_version,source)
    select attempt_key,id,teaching_group,original_class,bank_value,scoring_value,source_value from public.students where id=owner_id
    on conflict(id) do nothing;
end; $$;
revoke all on function public.portal_begin(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.portal_begin(uuid,uuid,text,text,text) to service_role;

-- Existing stale attempts from before this rule: keep only each student's newest unfinished attempt.
update public.assessment_attempts a set status='abandoned'
where a.status='in_progress' and exists(
  select 1 from public.assessment_attempts b
  where b.user_id=a.user_id and b.status='in_progress' and (b.started_at,b.id)>(a.started_at,a.id));

-- exam_status: none | in_progress (unfinished, started within 7 days, never completed) | quick | deep
create or replace function public.teacher_roster_summary()
returns table(student uuid, last_sign_in_at timestamptz, tracking_count integer, exam_status text, priority_groups text[], exam_completed_at timestamptz)
language sql stable security definer set search_path='' as $$
  select s.id,
    u.last_sign_in_at,
    (select count(*)::integer from public.tracking_items t where t.user_id=s.id and t.removed_at is null),
    case
      when d.completed_at is not null then 'deep'
      when q.completed_at is not null then 'quick'
      when exists(select 1 from public.assessment_attempts a where a.user_id=s.id and a.status='in_progress' and a.started_at>now()-interval '7 days') then 'in_progress'
      else 'none' end,
    case when d.completed_at is null then null else array(
      select g->>'name' from jsonb_array_elements(coalesce(d.report->'groups','[]'::jsonb)) with ordinality as e(g,n)
      where g->>'type'='priority' order by n) end,
    coalesce(d.completed_at,q.completed_at)
  from public.students s
  join auth.users u on u.id=s.id
  left join lateral (select r.report,r.completed_at from public.assessment_results r
    where r.user_id=s.id and (r.report->>'deep')::boolean order by r.completed_at desc,r.id desc limit 1) d on true
  left join lateral (select r.completed_at from public.assessment_results r
    where r.user_id=s.id order by r.completed_at desc,r.id desc limit 1) q on true
  where private.can_view_student(s.id);
$$;
revoke all on function public.teacher_roster_summary() from public,anon;
grant execute on function public.teacher_roster_summary() to authenticated;

-- When pasted into the dashboard SQL Editor, record it so a later `supabase db push` skips it.
do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations(version,name) values('20261029123000','teacher_roster_summary') on conflict do nothing;
  end if;
end $$;

commit;
