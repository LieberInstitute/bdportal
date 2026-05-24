# bdportal Project Overview

## Purpose and Runtime Shape

bdportal is an internal LIBD data portal for building brain/sample sets, browsing available assays, exploring bulk RNAseq plots, and requesting downloadable data products. The app is deployed behind nginx at `https://db.libd.net/bdportal`; the surveyed srv16 checkout matched org `master` commit `87f1c86`.

The repository contains two runtimes:

- A Preact/Vite frontend served from the repository root.
- A Node/Express middleware in `server/` that talks to Postgres, authentication/mail services, and LAN file staging locations.

For local development, run the middleware locally on `4095` and the Vite frontend on `8080`. The frontend calls a same-origin `/api` prefix, and Vite proxies `/api/*` to the middleware during development.

Use Node 22+ for frontend development; the root package declares `engines.node >=22.12`, includes `.nvmrc`, and uses Vite 7. The middleware still uses Node 18 for now. srv16 runs Node `v18.19.1`, and this local setup installed Homebrew `node@18` at `/opt/homebrew/opt/node@18/bin`. The middleware currently fails under Node 25 because transitive JWT dependencies use APIs removed from newer Node versions.

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

## Data and Generation Scripts

The app's bundled browser metadata is `public/data/multi_dta.json.gz`. It contains normalized arrays for data types, datasets, regions, diagnoses, subjects/brains, and sample metadata. The UI reindexes database IDs into compact client-side indexes while keeping database ID maps for backend requests.

Generation and database-adjacent files:

- `pull4webapp.pl`: pulls metadata from Postgres and writes the compressed JSON source used by the frontend.
- `dnam-pull4webapp.pl`: DNAm-related metadata extraction helper.
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
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
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
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
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
- `RDataCtx.jsx` contains many module-level mutable structures. When changing filters, counts, or selected sample logic, verify both Brain Set Builder and RNA pages.
- `dist/`, `build/`, and `node_modules/` are generated and ignored.

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
- Brain Set Builder matrix and browse tabs render.
- Bulk RNAseq select/explore tabs render for a valid loaded selection.
