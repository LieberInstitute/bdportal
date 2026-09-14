# bdportal

LIBD Brain Data Portal: Preact/Vite frontend (repo root) plus a Node/Express
middleware in `server/`, backed by the PostgreSQL `rse` database and the
HDF5 RSE store maintained in `~/work/R/dbwrk`.

Read `AGENTS.md` first (stack, local dev, env files, feature areas). Detailed
operational docs live in `docs/`:

- `docs/deployment.md`: srv16 layout, nginx routing, prod vs dev middleware
  services, deploy commands, verification.
- `docs/data-refresh.md`: regenerating `public/data/multi_dta.json.gz` with
  `dnam-pull4webapp.pl`, its data rules, and the DB/RSE upstream in dbwrk.
- `docs/releases/`: dated release notes (what data/schema/code changed).
- `README-project.md`: architecture overview.

## Working rules

- ASCII only in code, docs and commit messages. No AI attribution trailers.
- Do not commit `server/.env` (excluded via `.git/info/exclude`) or paste its
  values anywhere. Root `.env` is tracked; `deploy.sh` rewrites its commit
  hash/date lines.
- Frontend calls same-origin `/api`; never bake `srv16` hostnames or raw
  middleware ports into bundles.
- Keep the bundled JSON shape and `loadData()` in `src/comp/RDataCtx.jsx` in
  sync with `dnam-pull4webapp.pl`; run the generator, validate, then gzip.
- Data problems (missing demographics, unknown enum values) are fixed upstream
  in the dbwrk ETL or filtered by the generator with a stderr warning; never
  invent placeholder categories in the webapp.
- Verify after changes: `npm run lint`, `npm run build`, middleware
  `/ruthere` and `/pgplrinit`, then load the app in a browser.
- On srv16, `/dev/bdportal` is the dev deployment (own middleware on 4097);
  `/bdportal` is production (middleware on 4095). Changing the shared prod
  middleware or nginx needs an explicit decision from the user.
