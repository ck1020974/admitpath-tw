-- 一律以信箱登入：名單學生（原以學號登入）下次登入時必須綁定信箱。
-- 綁定後 Auth 帳號的信箱改為學生填寫的信箱，之後只能用信箱登入，學號登入停用。
-- 自行註冊的會員註冊時就以信箱為帳號，視為已綁定。
begin;
alter table public.students add column if not exists login_email_bound_at timestamptz;
update public.students set login_email_bound_at = created_at where account_type = 'member' and login_email_bound_at is null;
grant select(login_email_bound_at) on public.students to authenticated;

-- 註冊觸發器：會員一建立就算已綁定。
create or replace function private.handle_member_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name text := btrim(coalesce(meta->>'name', ''));
  consent text := btrim(coalesce(meta->>'consent_version', ''));
  school public.schools%rowtype;
begin
  if meta->>'account_type' is distinct from 'member' then return new; end if;
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
    contact_email, contact_email_updated_at, consent_version, consent_at, wants_updates, wants_updates_at, login_email_bound_at)
  values (
    new.id, 'member', null, display_name, '會員', '', '', lower(new.email),
    'member', school.county, school.code, school.name,
    lower(new.email), now(), consent, now(), coalesce(meta->>'wants_updates', '') = 'true', now(), now());
  return new;
end;
$$;

-- 綁定登入信箱（只限尚未綁定的名單學生本人）。
-- 直接更新 Auth 帳號信箱並視為已驗證：專案內建寄信只寄給專案成員，無法寄確認信給學生。
create or replace function public.student_bind_login_email(email_value text, updates_value boolean, consent_value text)
returns table(contact_email text, wants_updates boolean, consent_version text, consent_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cleaned text := lower(btrim(coalesce(email_value, '')));
  version text := btrim(coalesce(consent_value, ''));
begin
  if uid is null or not exists(select 1 from public.students s where s.id = uid and s.active and s.account_type = 'roster' and s.login_email_bound_at is null) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(cleaned) > 254 or cleaned !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or cleaned ~ '\.invalid$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'consent required' using errcode = '22023';
  end if;
  if exists(select 1 from auth.users u where lower(u.email) = cleaned and u.id <> uid) then
    raise exception 'email taken' using errcode = '23505';
  end if;
  update auth.users set email = cleaned, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = uid;
  update auth.identities set identity_data = identity_data || jsonb_build_object('email', cleaned), updated_at = now()
    where user_id = uid and provider = 'email';
  update public.students s set
    auth_email = cleaned,
    contact_email_updated_at = case when s.contact_email is distinct from cleaned then now() else s.contact_email_updated_at end,
    contact_email = cleaned,
    wants_updates_at = case when s.wants_updates is distinct from coalesce(updates_value, false) or s.wants_updates_at is null then now() else s.wants_updates_at end,
    wants_updates = coalesce(updates_value, false),
    consent_at = case when s.consent_version is distinct from version then now() else s.consent_at end,
    consent_version = version,
    login_email_bound_at = now()
  where s.id = uid;
  return query select s.contact_email, s.wants_updates, s.consent_version, s.consent_at from public.students s where s.id = uid;
end;
$$;
revoke all on function public.student_bind_login_email(text, boolean, text) from public, anon;
grant execute on function public.student_bind_login_email(text, boolean, text) to authenticated;

-- 學號登入只給尚未綁定信箱的名單學生。
create or replace function public.lookup_student_login(account_id text) returns text
language sql stable security definer set search_path = '' as $$
  select auth_email from public.students
  where student_id = upper(account_id) and active and account_type = 'roster' and login_email_bound_at is null;
$$;
revoke all on function public.lookup_student_login(text) from public, anon, authenticated;
grant execute on function public.lookup_student_login(text) to service_role;

do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations(version, name) values ('20261123120000', 'bind_login_email') on conflict do nothing;
  end if;
end $$;
commit;
