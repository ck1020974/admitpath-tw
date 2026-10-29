-- Restrict the platform-created DDL helper to its owner; event trigger remains enabled.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
-- Cover the teacher foreign key before enabling teacher history queries.
create index if not exists notes_teacher on public.counseling_notes(teacher_id);
