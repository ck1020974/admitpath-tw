-- One school. No roster, passwords, or credentials belong in this migration.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;

create table public.students (
  id uuid primary key references auth.users(id) on delete restrict,
  school_id text not null default 'yuhsin-school',
  student_id text not null unique check (student_id ~ '^[A-Z]{2}[0-9]{5}$'),
  name text not null check (length(name) between 1 and 100),
  teaching_group text not null,
  original_class text not null,
  original_seat_number text not null default '',
  auth_email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.teacher_access (
  id uuid primary key references auth.users(id) on delete restrict,
  school_id text not null default 'yuhsin-school',
  name text not null,
  active boolean not null default true,
  all_groups boolean not null default false,
  teaching_groups text[] not null default '{}',
  can_manage_accounts boolean not null default false,
  can_export boolean not null default false
);

create function private.is_student() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students where id = auth.uid() and active);
$$;
create function private.can_view_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.teacher_access t join public.students s on s.school_id = t.school_id
    where t.id = auth.uid() and t.active and s.id = target
      and (t.all_groups or s.teaching_group = any(t.teaching_groups))
  );
$$;
revoke all on function private.is_student() from public;
revoke all on function private.can_view_student(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_student(), private.can_view_student(uuid) to authenticated;

alter table public.students enable row level security;
alter table public.teacher_access enable row level security;
create policy student_profile_read on public.students for select to authenticated
  using ((id = (select auth.uid()) and active) or private.can_view_student(id));
create policy teacher_self_read on public.teacher_access for select to authenticated
  using (id = (select auth.uid()) and active);
revoke all on public.students, public.teacher_access from anon, authenticated;
grant select(id, school_id, student_id, name, teaching_group, original_class, original_seat_number, active, created_at) on public.students to authenticated;
grant select on public.teacher_access to authenticated;
grant all on public.students, public.teacher_access to service_role;

create table public.tracking_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.students(id),
  record_id text not null check(length(record_id) between 1 and 200),
  school_name text not null default '',
  department_name text not null default '',
  admission_year integer,
  admission_channel text,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  revision bigint not null default 1,
  unique(user_id, record_id)
);
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.students(id),
  teaching_group_at_test text not null,
  original_class_at_test text not null,
  bank_version text not null,
  scoring_version text not null,
  status text not null default 'in_progress' check(status in ('in_progress','complete','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id),
  user_id uuid not null references public.students(id),
  stage text not null check(stage in ('quick','extra','deep','revision')),
  round_number integer not null default 0 check(round_number between 0 and 20),
  content_hash text not null,
  answers jsonb not null,
  report jsonb not null,
  completed_at timestamptz not null default now(),
  unique(attempt_id, stage, round_number, content_hash)
);
create table public.counseling_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  teacher_id uuid not null references public.teacher_access(id),
  note text not null check(length(note) <= 10000),
  follow_up_at timestamptz,
  created_at timestamptz not null default now()
);
create index tracking_owner on public.tracking_items(user_id);
create index attempts_owner on public.assessment_attempts(user_id, started_at desc);
create index results_owner on public.assessment_results(user_id, completed_at desc);
create index notes_student on public.counseling_notes(student_id);

alter table public.tracking_items enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_results enable row level security;
alter table public.counseling_notes enable row level security;
create policy tracking_read on public.tracking_items for select to authenticated
  using ((user_id = (select auth.uid()) and private.is_student()) or private.can_view_student(user_id));
create policy attempts_read on public.assessment_attempts for select to authenticated
  using ((user_id = (select auth.uid()) and private.is_student()) or private.can_view_student(user_id));
create policy results_read on public.assessment_results for select to authenticated
  using ((user_id = (select auth.uid()) and private.is_student()) or private.can_view_student(user_id));
create policy teacher_notes_read on public.counseling_notes for select to authenticated
  using (private.can_view_student(student_id));
-- Until validated write endpoints are deployed, all history writes stay server-only.
revoke all on public.tracking_items, public.assessment_attempts, public.assessment_results, public.counseling_notes from anon, authenticated;
grant select on public.tracking_items, public.assessment_attempts, public.assessment_results, public.counseling_notes to authenticated;
grant all on public.tracking_items, public.assessment_attempts, public.assessment_results, public.counseling_notes to service_role;

create table private.login_buckets (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table private.login_buckets enable row level security;
create function public.consume_student_login_attempt(bucket_key text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare hit integer;
begin
  if bucket_key !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into private.login_buckets as b values(bucket_key, now(), 1)
  on conflict(bucket) do update set
    attempts = case when b.window_start < now() - interval '10 minutes' then 1 else b.attempts + 1 end,
    window_start = case when b.window_start < now() - interval '10 minutes' then now() else b.window_start end
  returning attempts into hit;
  return hit <= 10;
end;
$$;
create function public.lookup_student_login(account_id text) returns text
language sql stable security definer set search_path = '' as $$
  select auth_email from public.students where student_id = upper(account_id) and active;
$$;
revoke all on function public.consume_student_login_attempt(text), public.lookup_student_login(text) from public, anon, authenticated;
grant execute on function public.consume_student_login_attempt(text), public.lookup_student_login(text) to service_role;
commit;
