-- House Dark — database test report.
--
-- Prints every assertion recorded by the preceding test files and fails
-- the script (and therefore `npm run test:rls`) if any did not hold.

\set ON_ERROR_STOP on

select tests.act_as_service();

\echo ''
\echo '================================================================'
\echo ' House Dark - database tests'
\echo '================================================================'

select
  requirement as "req",
  case when passed then 'PASS' else 'FAIL' end as result,
  description,
  case when passed then '' else coalesce(detail, '') end as detail
from tests.results
order by id;

select
  count(*) filter (where passed) || ' passed, ' ||
  count(*) filter (where not passed) || ' failed, ' ||
  count(*) || ' total' as summary
from tests.results;

do $$
declare
  v_failed integer;
  v_list text;
begin
  select count(*), string_agg(requirement || ' ' || description, E'\n  ')
  into v_failed, v_list
  from tests.results where not passed;

  if v_failed > 0 then
    raise exception E'DATABASE TESTS FAILED: % assertion(s) did not hold:\n  %', v_failed, v_list;
  end if;
end
$$;

\echo 'All database tests passed.'
