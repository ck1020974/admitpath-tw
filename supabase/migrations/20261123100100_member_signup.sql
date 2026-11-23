-- 會員自行註冊（信箱＋密碼）與學校欄位。需先執行 20261123100000_school_directory.sql。
--
-- 帳號類型：
--   roster  名單匯入的學生，以學號登入（原有 231 位，皆為新北市林口康橋國際高中）。
--   member  自行註冊的會員，以信箱登入；沒有學號、班級。
--
-- 自行註冊的會員 school_id 一律是 'member'，不屬於任何教師的學校範圍，
-- 因此即使選了林口康橋，也不會出現在教師後台。若管理者確認身分後要讓老師看到，
-- 再手動把該生 school_id 改成教師的學校代號並設定 teaching_group。
begin;

-- 1. 學生與教師的縣市／學校欄位
alter table public.students
  add column if not exists account_type text not null default 'roster',
  add column if not exists county text,
  add column if not exists school_code text references public.schools(code),
  add column if not exists school_name text;
alter table public.teacher_access
  add column if not exists county text,
  add column if not exists school_code text references public.schools(code),
  add column if not exists school_name text;

do $$ begin
  alter table public.students add constraint students_account_type_check check (account_type in ('roster', 'member'));
exception when duplicate_object then null; end $$;

-- 會員沒有學號：學號只對名單學生必填。
alter table public.students alter column student_id drop not null;
alter table public.students drop constraint if exists students_student_id_check;
do $$ begin
  alter table public.students add constraint students_student_id_by_type check (
    (account_type = 'roster' and student_id ~ '^[A-Z]{2}[0-9]{5}$')
    or (account_type = 'member' and student_id is null));
exception when duplicate_object then null; end $$;

create index if not exists students_school_code on public.students(school_code);
create index if not exists teacher_access_school_code on public.teacher_access(school_code);

-- 2. 現有資料：全部設為 新北市／新北市林口康橋國際高中（教育部代碼 011330）
update public.students s set county = sc.county, school_code = sc.code, school_name = sc.name
  from public.schools sc where sc.code = '011330' and s.account_type = 'roster';
update public.teacher_access t set county = sc.county, school_code = sc.code, school_name = sc.name
  from public.schools sc where sc.code = '011330';

-- 學生可讀自己的帳號類型與學校；教師可讀被授權學生的同樣欄位。
grant select(account_type, county, school_code, school_name) on public.students to authenticated;

-- 3. 註冊時自動建立會員資料
-- 只處理 user_metadata.account_type = 'member' 的註冊；教師與名單學生由管理端建立，不經過這裡。
create or replace function private.handle_member_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name text := btrim(coalesce(meta->>'name', ''));
  consent text := btrim(coalesce(meta->>'consent_version', ''));
  school public.schools%rowtype;
begin
  if meta->>'account_type' is distinct from 'member' then return new; end if;
  -- 內部帳號網域（學生、教師）不開放自行註冊，避免搶占教師帳號名稱。
  if new.email is null or new.email ~* '\.invalid$' then
    raise exception 'MEMBER_EMAIL_NOT_ALLOWED' using errcode = '22023';
  end if;
  if length(display_name) not between 1 and 50 then
    raise exception 'MEMBER_NAME_INVALID' using errcode = '22023';
  end if;
  if consent !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'MEMBER_CONSENT_REQUIRED' using errcode = '22023';
  end if;
  select * into school from public.schools where code = meta->>'school_code';
  if not found then
    raise exception 'MEMBER_SCHOOL_INVALID' using errcode = '22023';
  end if;
  insert into public.students(
    id, school_id, student_id, name, teaching_group, original_class, original_seat_number, auth_email,
    account_type, county, school_code, school_name,
    contact_email, contact_email_updated_at, consent_version, consent_at, wants_updates, wants_updates_at)
  values (
    new.id, 'member', null, display_name, '會員', '', '', lower(new.email),
    'member', school.county, school.code, school.name,
    lower(new.email), now(), consent, now(), coalesce(meta->>'wants_updates', '') = 'true', now());
  return new;
end;
$$;
revoke all on function private.handle_member_signup() from public, anon, authenticated;

drop trigger if exists on_member_signup on auth.users;
create trigger on_member_signup after insert on auth.users
  for each row execute function private.handle_member_signup();

do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations(version, name) values ('20261123100000', 'school_directory'), ('20261123100100', 'member_signup') on conflict do nothing;
  end if;
end $$;
commit;
