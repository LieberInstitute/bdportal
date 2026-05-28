# bdportal Project Overview

## Purpose and Runtime Shape

bdportal is an internal LIBD data portal for building brain/sample sets, browsing available assays, exploring bulk RNAseq plots, and requesting downloadable data products. The app is deployed behind nginx at `https://db.libd.net/bdportal`; the surveyed srv16 checkout matched org `master` commit `87f1c86`.

The repository contains two runtimes:

- A Preact/Vite frontend served from the repository root.
- A Node/Express middleware in `server/` that talks to Postgres, authentication/mail services, and LAN file staging locations.

For local development, run the middleware locally on `4095` and the Vite frontend on `8080`. The frontend calls a same-origin `/api` prefix, and Vite proxies `/api/*` to the middleware during development.

Use Node 22+ for local development. The root and middleware packages both declare `engines.node >=22.12`, the root includes `.nvmrc`, and the frontend uses Vite 7. The middleware JWT dependency path was refreshed so it no longer requires the old Node 18 runtime.

## Frontend Architecture

The frontend entrypoint is `src/app.jsx`. It renders the global header, sets up shared providers, and switches between page modules based on the current hash route. Routing is custom and hash-based, with helpers in `src/comp/header.jsx`.

Primary route areas:

- `brsel`: Brain Set Builder, with `matrix` and `browse` tabs.
- `rna`: Bulk RNAseq, with `sel` and `exp` tabs. The reports component exists but is not currently exposed in the nav.
- `dnam`: placeholder DNA methylation page.
- `lrna`: placeholder long RNAseq page.

Important shared modules:

- `src/appcfg.js`: exports `APP_BASE_URL`, `MW_SERVER`, and commit metadata from Vite environment variables. By default, `MW_SERVER` is the app base path plus `/api`.
- `src/comp/RDataCtx.jsx`: central data/model layer for loaded metadata, filter state, selected samples/brains, login state, backend requests, downloads, and plot helpers.
- `src/comp/FltMList.jsx`, `AgeDualPanel.jsx`, `RSelSummary.jsx`: reusable filtering and selection UI.
- `src/pages/br/`: Brain Set Builder matrix and browse views.
- `src/pages/rna/`: RNA selection and exploration views.

Data loading starts in `RDataProvider`. The browser fetches `APP_BASE_URL + "data/multi_dta.json.gz"`, decompresses it with `fflate`, parses JSON, and populates global arrays and counts in `loadData()`.

## Feature Area Notes

Brain Set Builder and RNA exploration are the most developed frontend areas. Brain Set Builder uses shared metadata, filters, and selection summaries to build subject/sample sets and exports. RNA routes reuse the global selection/data model for expression exploration and plot/download requests.

When changing shared modules such as `RDataCtx.jsx`, verify every feature area that depends on the shared state, not only the screen that motivated the change. Table and export views should keep their rendered columns, filtered row sets, and CSV/download outputs in sync.

## Backend Architecture

The middleware lives in `server/server.js` and uses:

- `server/config.json` for base config such as database name and app port.
- `server/.env` for private local credentials and secrets: database host/user/password and JWT secret.
- `server/db.js` for a shared `pg` connection pool wrapper.

Default backend config:

- Database name: `rse`
- Port: `4095`
- DB host/user/password: from `server/.env`
- Hostname-specific paths: selected in `server/server.js`

Main middleware responsibilities:

- Authentication proxy and JWT validation: `/auth`, `/authck`
- User and activity logging: `/ulog`
- Mail forwarding: `/mail`
- Gene validation: `/pgdb/gcheck`
- Data export request generation: `/pgdb/adl`
- Plot generation request generation: `/pgdb/plotdl`
- Genotype request staging and email notification: `/gtreq`
- Generic database metadata routes: `/pgdb/:qry/:dtype?`
- Staged R output downloads: `/rstaging/:fpath`
- Static H5BASE-backed file downloads: `/stdata/:fpath`
- Health/status: `/ruthere`, `/pgplrinit`

The middleware assumes LAN services and file mounts exist. On development machines named `glin`, `gryzen`, or `gdebsrv`, it uses alternate local/LAN paths for R staging, H5 data, auth, and mail services. On srv16-like hosts, it defaults to LIBD deployment paths.

Backend details to keep in mind:

- `/auth` normalizes usernames, supports local dummy auth only when development env variables are set, and otherwise checks `useracc` before proxying to WebAuth.
- `/authck` verifies the JWT returned by `/auth`; the frontend login context depends on the `{ signed_user, token }` shape.
- `DDL_BASEURL` controls public links to prepared `/cdbFileStore` downloads. Keep it configurable rather than baking srv16 paths into frontend code.
- `/rstaging/:fpath` and `/stdata/:fpath` share a staged-file sender that verifies readability and reports `404`, `403`, or `500` depending on the failure.
- Several routes still reflect LAN path assumptions in `server/server.js`; read hostname-specific path setup before changing download, R staging, auth, or mail behavior.

## Data and Generation Scripts

The app's bundled browser metadata is `public/data/multi_dta.json.gz`. It contains normalized arrays for data types, datasets, regions, diagnoses, subjects/brains, and sample metadata. The UI reindexes database IDs into compact client-side indexes while keeping database ID maps for backend requests.

`dnam-pull4webapp.pl` is the current generator for this file. It splits DNAm datasets into separate 450k/WGBS data types and includes current subject-level metadata used by frontend views. Run it from the repo root against the LAN database host, then validate and compress the JSON:

```bash
./dnam-pull4webapp.pl -o public/data/multi_dta.json glin
node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync("public/data/multi_dta.json","utf8")); if(!Array.isArray(j.brains)||!j.brains.every(r=>Array.isArray(r)&&r.length>=11)) throw new Error("invalid brains shape"); console.log(j.dtypes.join(", "), j.brains.length)'
gzip -c public/data/multi_dta.json > public/data/multi_dta.json.gz
rm public/data/multi_dta.json
```

The `brains` rows include subject identifiers, demographic fields, sequencing flags, genotype status, and drop status. Check the generator and `loadData()` together when changing the metadata shape so bundled data and frontend parsing stay compatible.

Generation and database-adjacent files:

- `dnam-pull4webapp.pl`: canonical metadata generator for the frontend bundle.
- `pull4webapp.pl`: older metadata generator retained for reference unless a legacy workflow specifically needs it.
- `_db_.stored_procs_funcs.sql`: database-side stored procedures/functions used by data export and plotting flows.
- `plr_modules.7.R`: R/PLR support code related to database-side analysis.
- `server/gt_subset.sh`: helper for genotype subset generation.
- `nginx/bdportal-api-locations.conf`: production nginx proxy locations for same-origin middleware API routing.
- `nginx/install-bdportal-api-proxy.sh`: srv16 installer that backs up the nginx app snippet, installs the proxy locations, tests nginx, and reloads it.

## Local Setup

Clone:

```bash
gh repo clone LieberInstitute/bdportal /Users/gpertea/Documents/bdportal
cd /Users/gpertea/Documents/bdportal
```

Install dependencies:

```bash
npm ci
cd server
npm ci
```

Copy private middleware config from srv16:

```bash
scp srv16:~/work/web/bdportal/server/.env server/.env
printf "\nserver/.env\n" >> .git/info/exclude
```

For this Mac checkout, the copied env was adjusted to use `glin` as the DB host and the local `gpertea` Postgres user via `~/.pgpass`, avoiding a password copy in `server/.env`.

Run middleware:

```bash
cd server
npm start
```

Run frontend in another terminal:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
npm run build-based
```

Deployment-oriented build scripts choose different Vite base paths:

- `build-based`: `/bdportal/`
- `build-dev-based`: `/dev/bdportal/`
- `build-devel-based`: `/devel/bdportal/`

## Development Cautions

- Do not commit `server/.env` or paste its values into docs, logs, issues, or chat.
- The root `.env` is tracked and currently stores Vite build/runtime metadata. Be careful when deployment scripts modify it.
- Vite development mode proxies same-origin `/api/*` requests to local middleware.
- Production/build mode should normally leave `VITE_MWSERVER` empty so the app uses `/bdportal/api`, `/dev/bdportal/api`, or `/devel/bdportal/api`. nginx proxies those paths to middleware on `127.0.0.1:4095`.
- Set `VITE_MWSERVER` only for an intentional explicit middleware override; do not bake `srv16` hostnames or raw `:4095` URLs into deployable bundles.
- On srv16, run `nginx/install-bdportal-api-proxy.sh` to install the nginx locations before the static app locations in `/etc/nginx/snippets/app_dirs.conf`, run `nginx -t`, and reload nginx.
- Several backend SQL strings interpolate values directly. Treat new route/query work carefully and prefer parameterized queries.
- `RDataCtx.jsx` contains many module-level mutable structures. When changing filters, counts, or selected sample logic, verify all affected feature areas.
- Views with export/download behavior should keep visible UI state and generated outputs aligned.
- `dist/`, `build/`, and `node_modules/` are generated and ignored.

## Current Project Notes

- Same-origin middleware API routing should be preserved for local and deployed builds.
- Login is handled through an in-app same-origin dialog backed by middleware `/auth`.
- Frontend and middleware dependencies target Node 22+.
- Keep task-specific handoffs, feature plans, and latest-commit status notes in separate files so this project overview remains stable.

## Verification Checklist

After setup or meaningful code changes:

```bash
npm run lint
npm run build
curl http://localhost:4095/ruthere
curl http://localhost:4095/pgplrinit
curl http://localhost:8080/api/ruthere
curl http://localhost:8080/api/pgplrinit
```

Against `glin`, `GET /pgplrinit` should return `pl/r` when DB permissions and R libraries are healthy. Use `GET /pgdb/dslist/rnaseq` as an additional practical metadata DB smoke test.

Then open `http://localhost:8080` with the middleware running and check:

- The page loads `public/data/multi_dta.json.gz`.
- The header server status reaches middleware.
- Brain Set Builder tabs render.
- Bulk RNAseq select/explore tabs render for a valid loaded selection.
