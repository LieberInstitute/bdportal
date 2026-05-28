# bdportal Agent Guide

## Project Snapshot

bdportal is the LIBD Brain Data Portal, an internal web app for browsing brain/sample metadata and requesting or exploring derived data products.

Stack:
- Frontend: Preact 10 with Vite, Bootstrap, Reactstrap, jQuery helpers, and `fflate` for compressed JSON.
- Middleware: Node/Express in `server/`, listening on port `4095` by default.
- Data: PostgreSQL via `pg`, plus generated static metadata in `public/data/multi_dta.json.gz`.
- Deployment: internal nginx path `https://db.libd.net/bdportal`.
- Metadata generator: `dnam-pull4webapp.pl` is the current source for `public/data/multi_dta.json.gz`; it splits DNAm datasets into 450k/WGBS entries and emits the Brain Set Builder GUID field.

Use Node 22+ for local development. The root and middleware packages both declare `engines.node >=22.12`, and the root includes `.nvmrc`.

## Local Development

Install dependencies:

```bash
npm ci
cd server
npm ci
```

Run the local middleware:

```bash
cd server
npm start
```

Run the frontend dev server:

```bash
npm run dev
```

Expected local ports:
- Frontend: `http://localhost:8080`
- Middleware: `http://localhost:4095`

Useful checks:

```bash
npm run lint
npm run build
curl http://localhost:4095/ruthere
curl http://localhost:4095/pgplrinit
curl http://localhost:8080/api/ruthere
curl http://localhost:8080/api/pgplrinit
```

## Environment Files

- Root `.env` is tracked and provides Vite/build metadata such as `VITE_MWSERVER`, `VITE_COMMIT_HASH`, and `VITE_COMMIT_DATE`. Leave `VITE_MWSERVER` empty for normal same-origin deployments.
- `server/.env` is private local middleware configuration copied from srv16. It contains database and JWT secrets and must not be committed.
- This checkout excludes `server/.env` through `.git/info/exclude`.
- The backend also relies on the user's `~/.pgpass` and LAN access to the Postgres infrastructure.
- For this local checkout, `server/.env` was copied from srv16, then adjusted to use `DB_SRV=glin` and the local `gpertea` Postgres user through `~/.pgpass`.

## Important Directories

- `src/app.jsx`: application entrypoint and top-level page switching.
- `src/appcfg.js`: Vite environment and middleware URL configuration.
- `src/comp/`: shared UI, state, filtering, login, modal, and data helpers.
- `src/pages/`: page-level feature areas.
- `server/`: Express middleware, DB pool wrapper, and backend config.
- `public/data/`: bundled compressed metadata loaded by the browser.
- `assets/` and `public/images/`: app images and guide assets.

## Current Frontend Focus

Brain Set Builder is the active frontend work area:

- Main routes: `#/brsel/matrix` and `#/brsel/browse`.
- Browse UI: `src/pages/br/brbrowse.jsx`.
- Selection summary/export buttons: `src/comp/RSelSummary.jsx`.
- Global data, filters, counts, login, and backend helpers: `src/comp/RDataCtx.jsx`.
- Filter widgets: `src/comp/FltMList.jsx`, `src/comp/AgeDualPanel.jsx`.

Brain Browse implementation notes:

- `dtaBrains` rows currently include GUID as `[brint, guid, dx, race, sex, age, pmi, mod, has_seq, genotyped, dropped]` after client loading.
- `Show GUIDs (x)` is hidden by default and inserts `GUID` after `BrNum` when enabled. The count is donors in the current displayed brain set with non-empty GUIDs.
- `Show sample counts by brain region` switches from total assay-count columns to per-region count cells.
- `Keep sample counts for` controls which assay count chips/columns are visible; it does not change the donor set.
- `Filter to subjects that have` changes the donor set. In by-region mode, selected assays must occur in at least one same region.
- Export uses `getBrowseTable()` and must mirror the visible table state, including GUID visibility and assay count visibility.
- Sticky columns are `#`, `BrNum`, and `Dx`; when GUID is visible, `Dx` remains sticky after the inserted GUID column.
- Recent performance work caches selected-brain signatures and table-filtered rows with `brSetVersion`, but full unfiltered by-region tables are still large. Prefer testing with a narrowing filter such as `WGS samples` when validating UI behavior.

Latest pushed `devel` baseline for this handoff is `f5a150c Optimize brain browse table toggles`.

## Current Backend Focus

- Browser API calls should use same-origin `/api` paths. Vite rewrites `/api/*` to local middleware; nginx proxies `/bdportal/api/*`, `/dev/bdportal/api/*`, and `/devel/bdportal/api/*` to `127.0.0.1:4095`.
- Auth endpoints are `/auth` and `/authck`. Local dummy auth is enabled only on non-production-like hosts with `testUser`, `testPass`, and `JWTSHH`; production forwards to the WebAuth proxy after checking `useracc`.
- Useful DB smoke endpoints are `/ruthere`, `/pgplrinit`, and `/pgdb/dslist/rnaseq`.
- Staged download routes `/rstaging/:fpath` and `/stdata/:fpath` check file readability and return distinct `404`, `403`, or `500` errors.
- `DDL_BASEURL` can configure public `/cdbFileStore` links; do not hard-code `srv16` or direct middleware ports into frontend bundles.

## Working Notes

- The app uses hash routes such as `#/brsel/matrix`, `#/brsel/browse`, and `#/rna/exp`.
- The browser talks to middleware through the same-origin `/api` prefix. In local Vite development, `/api/*` is proxied and rewritten to the local middleware on port `4095`; in production, nginx proxies `/bdportal/api/*` to the middleware on `127.0.0.1:4095`.
- The nginx proxy template for production API routes is in `nginx/bdportal-api-locations.conf`; run `nginx/install-bdportal-api-proxy.sh` on srv16 to install those locations before static app locations.
- Many backend paths and service hosts are LAN-specific and selected from the machine hostname in `server/server.js` and `vite.config.mjs`.
- `GET /pgplrinit` should return `pl/r` when the DB permissions and R libraries on `glin` are healthy; ordinary metadata routes such as `/pgdb/dslist/rnaseq` are also useful DB smoke tests.
- Avoid broad refactors in `src/comp/RDataCtx.jsx`; it owns most global data structures, filters, counts, login state, and backend request helpers.
- Regenerate bundled metadata with `./dnam-pull4webapp.pl -o public/data/multi_dta.json glin`, validate the JSON, then gzip it to `public/data/multi_dta.json.gz`. The `brains` rows should be `[ord, brint, guid, dx, race, sex, age, pmi, mod, has_seq, genotyped, dropped]`.
- Keep generated build output in `dist/` out of normal edits unless explicitly working on deployment output.

## Browser Testing Notes

- Use the in-app Browser plugin for page loads, DOM snapshots, screenshots, visible-state checks, and verifying that Vite error overlays are gone.
- In this app, the Browser plugin's Playwright wrapper can fail on form input with a virtual clipboard/input error. If `locator.fill()` or `locator.type()` hits that path, do not spend time fighting it; verify the dialog opens in-browser and smoke-test the backing endpoint directly.
- For reliable form-entry regression tests, add a project-local Playwright test runner instead of relying on the in-app Browser wrapper.
- The full by-region Browse table can be huge, so use `Filter to subjects that have: WGS samples` for most Browser checks unless intentionally testing worst-case rendering.
