# Deployment (srv16)

## Layout

| Route (host `srv16.lieber.local` / `db.libd.net`) | Static files | Middleware |
| --- | --- | --- |
| `/bdportal/` (production) | `/var/www/html/bdportal/` | `bdportal-server.service`, port 4095, code in `/var/www/node/bdportal-server` (old `server.js`, pre-devel deps) |
| `/dev/bdportal/` (dev) | `/var/www/html/dev/bdportal/` | `bdportal-server-dev.service`, port 4097, code in this checkout's `server/` (`/home/gpertea/work/web/bdportal/server`) |
| `/devel/bdportal/` | `/var/www/html/devel/bdportal/` | production middleware (4095) |

Both nginx sites (`default` for `srv16.lieber.local`, `db.libd.net`) include
`/etc/nginx/snippets/app_dirs.conf`, which contains the `/…/bdportal/api/`
proxy locations (template: `nginx/bdportal-api-locations.conf`, installer:
`nginx/install-bdportal-api-proxy.sh`) followed by the static app locations.
Port 4096 belongs to `sibfinder-server.service`; do not reuse it.

The dev service unit (`/etc/systemd/system/bdportal-server-dev.service`) runs
Node 22 from `/scratch/gpertea/.local/share/nodejs/node-v22.17.1-linux-x64/bin/node`
(system `/usr/bin/node` is v18 and too old for the current `server/` deps),
with `DEV_PORT=4097` and `NODE_ENV=production`, as user `gpertea`, group
`www-data`. `server/.env` provides `DB_SRV`, `DB_USER`, `DB_PASS`, `JWTSHH`.
It reads `server.js` directly from the checkout, so a code change needs
`sudo systemctl restart bdportal-server-dev`.

## Frontend deploy

`deploy.sh` is the sanctioned path. It stamps the root `.env` with the current
commit hash/date, runs the matching Vite build and rsyncs `dist/` into the
target directory (after emptying it):

```bash
./deploy.sh dev     # -> /var/www/html/dev/bdportal   (build-dev-based)
./deploy.sh devel   # -> /var/www/html/devel/bdportal (build-devel-based)
./deploy.sh root    # -> /var/www/html/bdportal       (build-based, PRODUCTION)
```

Before deploying, refresh `public/data/multi_dta.json.gz` if the database
changed (see `data-refresh.md`), and run `npm ci` if `package-lock.json`
changed (root `node_modules` must provide Vite 7).

`deploy_gdeb_dev.sh` and the untracked `deploy_srv16_dev.sh` are older
single-purpose variants; prefer `deploy.sh`.

## Middleware deploy

Dev: the service already points at this checkout; `cd server && npm ci`
after dependency changes, then restart the unit.

Production: `/var/www/node/bdportal-server` is a separate copy, not a git
checkout. Promoting the devel middleware means syncing `server/*.js`,
`package.json`, `package-lock.json`, running `npm ci` there with Node 22 (the
unit currently uses `/usr/bin/npm`, Node 18: update `ExecStart` first), and
restarting `bdportal-server.service`. Its `.env` is a symlink to
`~/.bdportal.env`. This affects `/bdportal` immediately; get explicit approval.

## Verification

```bash
curl http://127.0.0.1:4097/ruthere        # online
curl http://127.0.0.1:4097/pgplrinit      # pl/r
curl http://srv16.lieber.local/dev/bdportal/api/ruthere
curl http://srv16.lieber.local/dev/bdportal/api/pgdb/dslist/rnaseq | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' http://srv16.lieber.local/dev/bdportal/data/multi_dta.json.gz
sudo nginx -t && journalctl -u bdportal-server-dev -n 20
```

Then open `http://srv16.lieber.local/dev/bdportal/#/brsel/matrix`, apply a
selection, open Browse and toggle "Show GUIDs".

## Known issue (2026-09-14)

The WebAuth proxy certificate at `https://192.168.77.16:6443` (nginx site
`wg-auth-6443`, cert `srv-v77-16`) expired on 2026-04-28. Both middlewares
reject it (`CERT_HAS_EXPIRED`), so `/auth` fails with 500 in production and
502 on dev for real users. Renewing the certificate is an infrastructure task
outside this repo. The devel `server.js` only relaxes TLS verification when
`NODE_ENV=development`; do not set that on a shared host without a decision.
