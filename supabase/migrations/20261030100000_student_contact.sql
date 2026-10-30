-- 學生聯絡信箱與同意紀錄。
-- 學生只能透過下列兩個函式讀寫「自己的」資料；一般教師讀不到，只有網站管理者（can_manage_accounts）可在教師後台看到信箱。
-- 請在 Supabase SQL Editor 執行一次（可重複執行，不會重複建立欄位）。
begin;
alter table public.students
  add column if not exists contact_email text,
  add column if not exists contact_email_updated_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists consent_at timestamptz,
  add column if not exists wants_updates boolean not null default false,
  add column if not exists wants_updates_at timestamptz;

do $$ begin
  alter table public.students add constraint students_contact_email_format
    check (contact_email is null or (length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
exception when duplicate_object then null; end $$;

-- 讀取自己的聯絡資料（沒有同意紀錄時回傳 consent_version = null）
create or replace function public.student_contact_info()
returns table(contact_email text, wants_updates boolean, consent_version text, consent_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.contact_email, s.wants_updates, s.consent_version, s.consent_at
  from public.students s where s.id = auth.uid() and s.active;
$$;

-- 首次填寫或日後修改。每次儲存都必須帶同意的說明版本（代表學生已勾選同意）。
create or replace function public.student_save_contact(email_value text, updates_value boolean, consent_value text)
returns table(contact_email text, wants_updates boolean, consent_version text, consent_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare
  cleaned text := lower(btrim(coalesce(email_value, '')));
  version text := btrim(coalesce(consent_value, ''));
begin
  if auth.uid() is null or not private.is_student() then
    raise exception 'not a student' using errcode = '42501';
  end if;
  if length(cleaned) > 254 or cleaned !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'consent required' using errcode = '22023';
  end if;
  update public.students s set
    contact_email_updated_at = case when s.contact_email is distinct from cleaned then now() else s.contact_email_updated_at end,
    contact_email = cleaned,
    wants_updates_at = case when s.wants_updates is distinct from coalesce(updates_value, false) or s.wants_updates_at is null then now() else s.wants_updates_at end,
    wants_updates = coalesce(updates_value, false),
    consent_at = case when s.consent_version is distinct from version then now() else s.consent_at end,
    consent_version = version
  where s.id = auth.uid() and s.active;
  return query select s.contact_email, s.wants_updates, s.consent_version, s.consent_at
    from public.students s where s.id = auth.uid() and s.active;
end;
$$;

-- 網站管理者專用：教師後台顯示與搜尋學生信箱（一般授課老師回傳空的）
create or replace function public.admin_student_contacts()
returns table(student uuid, contact_email text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.contact_email
  from public.students s
  where s.contact_email is not null
    and exists(select 1 from public.teacher_access t where t.id = auth.uid() and t.active and t.can_manage_accounts)
    and private.can_view_student(s.id);
$$;

revoke all on function public.admin_student_contacts() from public, anon;
grant execute on function public.admin_student_contacts() to authenticated;
revoke all on function public.student_contact_info() from public, anon;
revoke all on function public.student_save_contact(text, boolean, text) from public, anon;
grant execute on function public.student_contact_info(), public.student_save_contact(text, boolean, text) to authenticated;
commit;
