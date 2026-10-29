-- Temporary import requests require an expiring, one-use 256-bit token.
begin;
create table private.provision_jobs (
  token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending' check(state in ('pending','running','complete','failed')),
  expires_at timestamptz not null default now() + interval '20 minutes',
  created_count integer not null default 0,
  updated_count integer not null default 0,
  failed_count integer not null default 0
);
alter table private.provision_jobs enable row level security;
create function public.claim_student_provision(token_hash_value text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare updated integer;
begin
  update private.provision_jobs set state = 'running'
  where token_hash = token_hash_value and state = 'pending' and expires_at > now();
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;
create function public.finish_student_provision(token_hash_value text, created_value integer, updated_value integer, failed_value integer) returns void
language sql security definer set search_path = '' as $$
  update private.provision_jobs set state = case when failed_value = 0 then 'complete' else 'failed' end,
    created_count = created_value, updated_count = updated_value, failed_count = failed_value
  where token_hash = token_hash_value and state = 'running';
$$;
revoke all on function public.claim_student_provision(text), public.finish_student_provision(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_student_provision(text), public.finish_student_provision(text, integer, integer, integer) to service_role;
commit;
