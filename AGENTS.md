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
