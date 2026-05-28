# bdportal Middleware

Node/Express middleware for bdportal. Use Node `>=22.12`.

## Setup

```bash
cd server
npm ci
```

`server/.env` is required for local development and must stay private. It provides database connection values, JWT secret, optional development login credentials, and service overrides such as `AUTH_SRV`, `DEV_PORT`, and `DDL_BASEURL`.

## Commands

```bash
npm start       # nodemon server.js
npm run server  # node server.js
npm run client  # run frontend dev server from repo root
npm run devboth # middleware + frontend together
```

Default middleware port is `4095`, unless `DEV_PORT` overrides it.

## Smoke Checks

With the middleware running:

```bash
curl http://localhost:4095/ruthere
curl http://localhost:4095/pgplrinit
curl http://localhost:4095/pgdb/dslist/rnaseq
```

Expected healthy responses:

- `/ruthere`: `online`
- `/pgplrinit`: `pl/r`
- `/pgdb/dslist/rnaseq`: dataset metadata rows

## Notes

- Browser clients should reach this middleware through same-origin `/api` paths, not direct `:4095` production URLs.
- `/auth` supports local dummy auth only outside production-like hosts when `testUser`, `testPass`, and `JWTSHH` are configured.
- Production auth is server-side through the WebAuth proxy, with `useracc` checked before forwarding credentials.
- `/rstaging/:fpath` and `/stdata/:fpath` use readability checks before sending files and distinguish `404`, `403`, and `500` failure modes.
