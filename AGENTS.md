# bdportal Agent Guide

## Project Snapshot

bdportal is the LIBD Brain Data Portal, an internal web app for browsing brain/sample metadata and requesting or exploring derived data products.

Stack:
- Frontend: Preact 10 with Vite, Bootstrap, Reactstrap, jQuery helpers, and `fflate` for compressed JSON.
- Middleware: Node/Express in `server/`, listening on port `4095` by default.
- Data: PostgreSQL via `pg`, plus generated static metadata in `public/data/multi_dta.json.gz`.
- Deployment: internal nginx path `http://srv16.lieber.local/bdportal`.

Use Node 18 for this project. The middleware currently fails under Node 25 because older JWT dependencies rely on APIs removed from newer Node releases. On this machine, Node 18 is available at `/opt/homebrew/opt/node@18/bin`.

## Local Development

Install dependencies:

```bash
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
npm ci
cd server && npm ci
```

Run the local middleware:

```bash
cd server
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
npm start
```

Run the frontend dev server:

```bash
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"
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
```

## Environment Files

- Root `.env` is tracked and provides Vite/build metadata such as `VITE_MWSERVER`, `VITE_COMMIT_HASH`, and `VITE_COMMIT_DATE`.
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
- In Vite development, API requests under `/pgdb`, `/auth`, `/mail`, `/ruthere`, `/pgplrinit`, `/rstaging`, `/ulog`, `/gtreq`, and `/stdata` proxy to the local middleware.
- Many backend paths and service hosts are LAN-specific and selected from the machine hostname in `server/server.js` and `vite.config.js`.
- `GET /pgplrinit` should return `pl/r` when the DB permissions and R libraries on `glin` are healthy; ordinary metadata routes such as `/pgdb/dslist/rnaseq` are also useful DB smoke tests.
- Avoid broad refactors in `src/comp/RDataCtx.jsx`; it owns most global data structures, filters, counts, login state, and backend request helpers.
- Keep generated build output in `dist/` out of normal edits unless explicitly working on deployment output.
