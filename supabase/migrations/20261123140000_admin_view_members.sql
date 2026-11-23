-- 網站管理者（teacher_access.can_manage_accounts）在教師後台也看得到自行註冊的會員（school_id = 'member'）。
-- 一般授課老師仍只看得到自己學校、自己被授權班群的名單學生。
-- 教師後台名單、登入／作答摘要、追蹤清單、探索成果與信箱都透過 can_view_student 判斷，因此一併生效。
begin;
create or replace function private.can_view_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.teacher_access t join public.students s on s.school_id = t.school_id
    where t.id = auth.uid() and t.active and s.id = target
      and (t.all_groups or s.teaching_group = any(t.teaching_groups))
  ) or exists(
    select 1 from public.teacher_access t join public.students s on s.school_id = 'member'
    where t.id = auth.uid() and t.active and t.can_manage_accounts and s.id = target
  );
$$;
revoke all on function private.can_view_student(uuid) from public;
grant execute on function private.can_view_student(uuid) to authenticated;

do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations(version, name) values ('20261123140000', 'admin_view_members') on conflict do nothing;
  end if;
end $$;
commit;
