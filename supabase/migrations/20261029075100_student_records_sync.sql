-- Only verified server handlers may write. Existing RLS read scopes remain unchanged.
create table private.sync_operations (
  user_id uuid not null references public.students(id), operation_id uuid not null,
  created_at timestamptz not null default now(), primary key(user_id,operation_id)
);
alter table private.sync_operations enable row level security;
alter table public.assessment_attempts add column source text not null default 'live' check(source in ('live','browser_import'));
create unique index results_content_once on public.assessment_results(attempt_id,content_hash);

create function public.portal_begin(owner_id uuid, attempt_key uuid, bank_value text, scoring_value text, source_value text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.students where id=owner_id and active) then raise sqlstate 'PT403' using message='STUDENT_DISABLED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('attempt:'||owner_id::text,0));
  if exists(select 1 from public.assessment_attempts where id=attempt_key and user_id<>owner_id) then raise sqlstate 'PT403' using message='FORBIDDEN'; end if;
  if not exists(select 1 from public.assessment_attempts where id=attempt_key) and
    (select count(*) from public.assessment_attempts where user_id=owner_id and started_at>now()-interval '1 day')>=30
    then raise sqlstate 'PT429' using message='DAILY_ATTEMPT_LIMIT'; end if;
  insert into public.assessment_attempts(id,user_id,teaching_group_at_test,original_class_at_test,bank_version,scoring_version,source)
    select attempt_key,id,teaching_group,original_class,bank_value,scoring_value,source_value from public.students where id=owner_id
    on conflict(id) do nothing;
end; $$;

create function public.portal_result(owner_id uuid,attempt_key uuid,bank_value text,scoring_value text,source_value text,snapshot_value jsonb,report_value jsonb,hash_value text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result_key uuid; phase text; round_value integer; previous_round integer;
begin
  perform public.portal_begin(owner_id,attempt_key,bank_value,scoring_value,source_value);
  select id into result_key from public.assessment_results where attempt_id=attempt_key and content_hash=hash_value;
  if result_key is not null then return jsonb_build_object('saved',true,'duplicate',true,'id',result_key); end if;
  if (select count(*) from public.assessment_results where attempt_id=attempt_key)>=200 then raise sqlstate 'PT429' using message='RESULT_LIMIT'; end if;
  round_value:=coalesce((report_value->>'extraRounds')::integer,0);
  select coalesce(max(round_number),0) into previous_round from public.assessment_results where attempt_id=attempt_key;
  phase:=case
    when round_value>previous_round then 'extra'
    when (report_value->>'deep')::boolean and not exists(select 1 from public.assessment_results where attempt_id=attempt_key and stage='deep') then 'deep'
    when not exists(select 1 from public.assessment_results where attempt_id=attempt_key) then 'quick'
    else 'revision' end;
  insert into public.assessment_results(attempt_id,user_id,stage,round_number,content_hash,answers,report)
    values(attempt_key,owner_id,phase,round_value,hash_value,snapshot_value,report_value) returning id into result_key;
  update public.assessment_attempts set status='complete',completed_at=now() where id=attempt_key and user_id=owner_id;
  return jsonb_build_object('saved',true,'duplicate',false,'id',result_key);
end; $$;

create function public.portal_tracking(owner_id uuid,operation_key uuid,changes_value jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare change jsonb; current_revision bigint; current_count integer;
begin
  if not exists(select 1 from public.students where id=owner_id and active) then raise sqlstate 'PT403' using message='STUDENT_DISABLED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tracking:'||owner_id::text,0));
  if exists(select 1 from private.sync_operations where user_id=owner_id and operation_id=operation_key) then return jsonb_build_object('saved',true,'duplicate',true); end if;
  if jsonb_array_length(changes_value) not between 1 and 100 then raise sqlstate 'PT422' using message='INVALID_CHANGES'; end if;
  for change in select value from jsonb_array_elements(changes_value) loop
    select revision into current_revision from public.tracking_items where user_id=owner_id and record_id=change->>'recordId';
    if coalesce(current_revision,0)<>(change->>'revision')::bigint then raise sqlstate 'PT409' using message='SYNC_CONFLICT'; end if;
    insert into public.tracking_items(user_id,record_id,school_name,department_name,admission_year,admission_channel,position,removed_at)
      values(owner_id,change->>'recordId',coalesce(change->>'school',''),coalesce(change->>'department',''),(change->>'year')::integer,change->>'channel',coalesce((change->>'position')::integer,0),case when (change->>'removed')::boolean then now() else null end)
    on conflict(user_id,record_id) do update set removed_at=excluded.removed_at,revision=public.tracking_items.revision+1,
      school_name=case when excluded.school_name='' then public.tracking_items.school_name else excluded.school_name end,
      department_name=case when excluded.department_name='' then public.tracking_items.department_name else excluded.department_name end,
      admission_year=coalesce(excluded.admission_year,public.tracking_items.admission_year),
      admission_channel=coalesce(excluded.admission_channel,public.tracking_items.admission_channel),
      added_at=case when excluded.removed_at is null and public.tracking_items.removed_at is not null then now() else public.tracking_items.added_at end;
  end loop;
  select count(*) into current_count from public.tracking_items where user_id=owner_id and removed_at is null;
  if current_count>100 then raise sqlstate 'PT422' using message='TRACKING_LIMIT'; end if;
  insert into private.sync_operations(user_id,operation_id) values(owner_id,operation_key);
  return jsonb_build_object('saved',true,'duplicate',false);
end; $$;
revoke all on function public.portal_begin(uuid,uuid,text,text,text),public.portal_result(uuid,uuid,text,text,text,jsonb,jsonb,text),public.portal_tracking(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.portal_begin(uuid,uuid,text,text,text),public.portal_result(uuid,uuid,text,text,text,jsonb,jsonb,text),public.portal_tracking(uuid,uuid,jsonb) to service_role;
