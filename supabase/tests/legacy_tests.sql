-- Checks after the November 2026 migration ran on data like production's.
create temp table t_results (name text, pass boolean);
insert into t_results values ('old direct sign-up keeps its college', (select org_id is not null from public.profiles where id = '11000000-0000-4000-8000-000000000011'));
insert into t_results values ('old direct sign-up stays linked on the roster', (select user_id is not null from public.org_students where email = 'old.direct@alpha.example'));
insert into t_results values ('old temporary password is flagged in app_metadata', (select raw_app_meta_data ->> 'must_change_password' = 'true' from auth.users where id = '12000000-0000-4000-8000-000000000012'));
insert into t_results values ('old temporary password is already expired', (select (raw_app_meta_data ->> 'temp_password_expires_at')::timestamptz <= now() from auth.users where id = '12000000-0000-4000-8000-000000000012'));
insert into t_results values ('old temporary account is tied to its college', (select raw_app_meta_data ->> 'provisioned_org' = '0a000000-0000-4000-8000-00000000000a' from auth.users where id = '12000000-0000-4000-8000-000000000012'));
insert into t_results values ('platform admin with no college keeps the role', (select count(*) = 1 from public.user_roles where user_id = '13000000-0000-4000-8000-000000000013' and role = 'super_admin'));
insert into t_results values ('no invalid provisioned_org was written', not exists (select 1 from auth.users where raw_app_meta_data ->> 'provisioned_org' = 'unknown'));
insert into t_results values ('unconfirmed account loses what the old trigger gave it', (select org_id is null from public.profiles where id = '14000000-0000-4000-8000-000000000014'));
insert into t_results values ('former admin left in place by the form loses the role', not exists (select 1 from public.user_roles where user_id = '16000000-0000-4000-8000-000000000016'));
insert into t_results values ('current admin keeps the role', exists (select 1 from public.user_roles where user_id = '15000000-0000-4000-8000-000000000015' and role = 'org_admin'));
insert into t_results values ('a student stuck on partial academics is released', (select academics_source = 'default' from public.profiles where id = '17000000-0000-4000-8000-000000000017'));
insert into t_results values ('NPTEL certificates go back to the placement cell', (select status = 'pending' from public.credentials where ref = 'NPTEL24EE42S10000001'));
update public.org_students set section = 'B' where email = 'old.direct@alpha.example';
insert into t_results values ('a roster update still works on an oversized old row', (select section = 'B' from public.profiles where id = '11000000-0000-4000-8000-000000000011'));
select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
