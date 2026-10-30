-- 網站管理者專用：刪除指定學生的全部學群探索紀錄（每次作答與結果），無法復原。
-- 一般授課老師不能呼叫；追蹤清單與學生帳號不受影響。
begin;
create or replace function public.admin_delete_assessments(target uuid)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare removed integer;
begin
  if not exists(select 1 from public.teacher_access t where t.id = auth.uid() and t.active and t.can_manage_accounts)
     or not private.can_view_student(target) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- 與 portal_begin 使用同一把鎖，避免刪除時學生剛好在儲存成果。
  perform pg_advisory_xact_lock(hashtextextended('attempt:' || target::text, 0));
  delete from public.assessment_results where user_id = target;
  delete from public.assessment_attempts where user_id = target;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.admin_delete_assessments(uuid) from public, anon;
grant execute on function public.admin_delete_assessments(uuid) to authenticated;
commit;
