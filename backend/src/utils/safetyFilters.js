// Builds an optional SQL AND-clause for the "same company only" / "same gender only"
// trust filters, with placeholders starting at `startIndex` so callers can splice it
// into queries that already have their own positional params.
function buildSafetyFilters({ sameCompanyOnly, sameGenderOnly, me, startIndex }) {
  const clauses = [];
  const params = [];
  let idx = startIndex;

  if (sameCompanyOnly === 'true' && me?.company_name) {
    clauses.push(`u.company_name = $${idx}`);
    params.push(me.company_name);
    idx += 1;
  }
  if (sameGenderOnly === 'true' && me?.gender) {
    clauses.push(`u.gender = $${idx}`);
    params.push(me.gender);
    idx += 1;
  }

  return { clause: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params };
}

module.exports = { buildSafetyFilters };
