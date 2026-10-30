-- Students choose their career tracks during onboarding. Safe to run more than once.
--
-- Students update profiles column by column (20261008000000_organizations.sql granted UPDATE on the columns that
-- existed then). profiles.tracks was added later (20261025000000) without a grant, so every onboarding save failed with
-- "permission denied for table profiles". section, program and academics_source stay ungranted on purpose: the roster
-- and the pin_roster_fields trigger own them.
grant update (tracks) on public.profiles to authenticated;
