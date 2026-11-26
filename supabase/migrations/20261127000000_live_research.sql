-- Live company research, the Placement score's inputs, and two branch-name fixes. One transaction, safe to run twice.
-- Apply after 20261125000000_checklist_fixes.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Branch rule: the same patterns as src/data/engineering (scripts/branch-parity.mjs fails CI if they disagree).
--    Two fixes: "AI & Data Science" is now read as AIDS (it was DS), and "Electronics & Computer Engineering" as ECM
--    before CSE (it was CSE, because it also says "computer engineering"). Drive matching compares every code a name
--    matches, so only these two names gain a code.
-- ---------------------------------------------------------------------------
create or replace function private.branch_codes(s text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(array(select v.code from (values
    ('CSE-AIML', '\y(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence( and| &)? machine learning)\y'),
    ('AIDS', '\y(ai ?& ?ds|aids|(ai|artificial intelligence)( and| &| ?& ?)? data science)\y'),
    ('DS', '\y(ds|data science)\y'),
    ('CSE-CS', '\y(cyber ?security|cse ?\(?cs\)?|cs ?& ?cs)\y'),
    ('CSE-IOT', '\y(cse ?\(?iot\)?|internet of things)\y'),
    ('CSBS', '\y(csbs|business systems)\y'),
    ('AI', '\y(artificial intelligence|ai)\y'),
    ('ECM', '\y(ecm|electronics( and| &)? computer)\y'),
    ('CSE', '\y(cse|computer science|cs|computer engineering)\y'),
    ('IT', '\y(it|information technology)\y'),
    ('VLSI', '\y(vlsi)\y'),
    ('EIN', '\y(electrical( and| &)? instrumentation)\y'),
    ('EIE', '\y(eie|e ?& ?i|electronics( and| &)? instrumentation|instrumentation)\y'),
    ('ETE', '\y(ete|extc|e ?& ?tc|telecommunication)\y'),
    ('ECE', '\y(ece|electronics( and| &)? communication)\y'),
    ('EEE', '\y(eee|electrical( and| &)? electronics)\y'),
    ('EE', '\y(ee|electrical)\y'),
    ('MECHATRONICS', '\y(mechatronics)\y'),
    ('ROBOTICS', '\y(robotics|automation)\y'),
    ('AUTO', '\y(automobile|automotive)\y'),
    ('AERO', '\y(aeronautical|aerospace|aero)\y'),
    ('PROD', '\y(production|industrial engineering|manufacturing)\y'),
    ('MARINE', '\y(marine|naval)\y'),
    ('MECH', '\y(mech|mechanical|me)\y'),
    ('CIVIL', '\y(civil|construction|environmental|transportation engineering)\y'),
    ('PETRO', '\y(petroleum|petrochemical)\y'),
    ('CHEM', '\y(chemical|polymer|food tech(nology)?)\y'),
    ('BIOTECH', '\y(biotech(nology)?|bio-?technology)\y'),
    ('BME', '\y(biomedical|bme)\y'),
    ('META', '\y(metallurg(y|ical)|materials)\y'),
    ('MINING', '\y(mining)\y'),
    ('TEXTILE', '\y(textile)\y'),
    ('AGRI', '\y(agricultur(e|al))\y')
    ) v(code, re) where s ~* v.re), '{}'::text[]),
    array[upper(trim(s))]
  );
$$;
revoke all on function private.branch_codes(text) from public, anon;
grant execute on function private.branch_codes(text) to authenticated;

commit;
