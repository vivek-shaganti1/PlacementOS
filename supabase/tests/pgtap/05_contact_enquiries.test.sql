-- pgTAP: contact enquiries (20261114000000_contact_enquiries.sql).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(11);

select is(public.contact_submit('Dr. Rao', 'Tap College', 'Rao@TapC.test', '', 'Pro plan', 'We have 900 students.', '203.0.113.1'), 'ok', 'the server can store an enquiry');
select is((select email from public.contact_enquiries where college = 'Tap College'), 'rao@tapc.test', 'the email is stored in lower case');
select is(public.contact_submit('Dr. Rao', 'Tap College', 'rao@tapc.test', '', '', 'Second message here.', '203.0.113.2'), 'ok', 'a second message from the same email is accepted');
select is(public.contact_submit('Dr. Rao', 'Tap College', 'rao@tapc.test', '', '', 'Third message here.', '203.0.113.3'), 'ok', 'and a third');
select is(public.contact_submit('Dr. Rao', 'Tap College', 'rao@tapc.test', '', '', 'Fourth message here.', '203.0.113.4'), 'limited', 'the fourth in a day from one email is refused');
select is((select count(*)::int from public.contact_enquiries where email = 'rao@tapc.test'), 3, 'and not stored');

select ok(not has_function_privilege('anon', 'public.contact_submit(text,text,text,text,text,text,text)', 'execute')
      and not has_function_privilege('authenticated', 'public.contact_submit(text,text,text,text,text,text,text)', 'execute'),
  'only the server may call contact_submit');
select ok(not has_table_privilege('anon', 'public.contact_enquiries', 'select') and not has_table_privilege('authenticated', 'public.contact_enquiries', 'insert'),
  'visitors cannot read enquiries and signed-in users cannot insert them directly');

insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status)
values ('00000000-0000-4000-a000-0000000000e1', 'Enquiry College', array['enq.test'], array['cell@enq.test'], 'pro', 50, 'active');
insert into private.platform_admin_emails (email) values ('boss@enq-piq.test') on conflict do nothing;
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cell@enq.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-4000-b000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'boss@enq-piq.test', now(), '{}', '{}', now(), now());
update auth.users set email_confirmed_at = now() where id in ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-b000-0000000000e2');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000e1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.contact_enquiries), 0, 'a placement cell cannot read enquiries');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000e2","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.contact_enquiries where email = 'rao@tapc.test'), 3, 'a platform admin reads them');
select lives_ok(
  $$update public.contact_enquiries set status = 'handled', handled_by = '00000000-0000-4000-b000-0000000000e2', handled_at = now() where email = 'rao@tapc.test'$$,
  'and can mark them handled'
);

reset role;
select * from finish();
rollback;
