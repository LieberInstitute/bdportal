# Incident Report: metadata export shows "file does not exist" when file is actually created

Date investigated: 2026-03-17 (America/New_York)
Service: bdportal node/express backend (`/var/www/node/bdportal-server`)

## Summary

The frontend error:

`ERROR: file does not exist: /dbdata/cdb/r_staging/r26ea6e472dda87/BrainSeq_Phase2_DLPFC_Sample_Metadata_n346.csv`

was caused by **filesystem permission denial (`EACCES`)** on the server process, not by a missing file.

The API route used `fs.existsSync(...)`, which returns `false` for both "does not exist" and "cannot access", so permission failures were misreported as missing files.

## What worked in diagnosis (successful actions)

1. Located exact error source in backend code:
   - `server.js` route `GET /rstaging/:fpath` was returning `ERROR: file does not exist: ...`
2. Confirmed save path and download path are in the same staging tree (`/dbdata/cdb/r_staging`).
3. Checked directory permissions and ACLs:
   - `/dbdata/cdb/r_staging` was `drwx------` (`700`), owner `postgres`, group `www-data`.
   - ACL showed `group::---`, so group had no traverse/read rights.
4. Verified from Node runtime context that access fails with `EACCES` on the exact file path:
   - `existsSync` was `false` and `fs.accessSync(..., F_OK)` threw `EACCES`.
5. Correlated service logs:
   - `journalctl -u bdportal-server` showed `save_rse(...)` call completed, then immediate `/rstaging/...` requests failed.

## Crucial logs and where to find them

### Node/Express (primary for this issue)

- Service unit: `bdportal-server.service`
- Live/status:
  - `systemctl status bdportal-server --no-pager`
- Incident window logs:
  - `journalctl -u bdportal-server --since "2026-03-17 16:10" --until "2026-03-17 16:20" --no-pager`

These logs show:
- incoming `save_rse(...)` request
- query completion
- immediate `/rstaging/...` fetch attempts

### PostgreSQL logs (secondary here)

- Cluster logging config indicates CSV logs under PG data dir (`log_destination=csvlog`, `logging_collector=on`, `log_directory='logs'`).
- On this host, that points to a path like:
  - `/var/lib/postgresql/17/main/logs/`
- Traditional `/var/log/postgresql/postgresql-*-main.log` files existed but were empty during this incident.

PostgreSQL logs are useful for DB-side function failures; in this incident the failing step was Node file read permission after DB save.

### Nginx logs (tertiary for this case)

- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`

Useful for request-level tracing when proxying is in-path.
Current app builds use same-origin `/bdportal/api`, `/dev/bdportal/api`, or `/devel/bdportal/api` routes, so nginx may be in-path before the Node service.

## Root cause

- Staging directory permission policy prevented the Node service user from traversing/reading generated files.
- API route used existence check semantics that masked permission problems as not-found.

## Fixes required

## 1) Ops fix (required): grant least-privilege read/traverse ACLs

Use ACLs (recommended) so ownership stays with `postgres` while app can read/download.

Example (requires sudo/root):

```bash
# allow app users to traverse/read staging tree now
sudo setfacl -m u:gpertea:rx /dbdata/cdb/r_staging
sudo setfacl -R -m u:gpertea:rx /dbdata/cdb/r_staging

# if service user webapp also needs direct access:
sudo setfacl -m u:webapp:rx /dbdata/cdb/r_staging
sudo setfacl -R -m u:webapp:rx /dbdata/cdb/r_staging

# make defaults inherit for new dirs/files
sudo setfacl -d -m u:gpertea:rx /dbdata/cdb/r_staging
sudo setfacl -d -m u:webapp:rx /dbdata/cdb/r_staging

# verify
getfacl -p /dbdata/cdb/r_staging
```

Adjust principals to match actual serving user(s).

## 2) Code fix (implemented): accurate error handling in file routes

Backend was updated to:
- use `fs.access(..., R_OK)` instead of `fs.existsSync(...)`
- map errors explicitly:
  - `ENOENT` -> HTTP 404
  - `EACCES` -> HTTP 403
  - other fs errors -> HTTP 500
- log access/send error code and file path for faster diagnosis.

## Post-fix validation checklist

1. Export metadata from frontend.
2. Confirm API response is file download (200) and file contents are readable.
3. If a path truly does not exist, confirm API returns 404.
4. If permissions are intentionally revoked, confirm API returns 403 (not false 404).
5. Check `journalctl -u bdportal-server` for clear error code logging.

## Notes

- I could not apply ACL changes directly in this session because sudo privileges were unavailable.
- The backend hardening is implemented in `server/server.js`.
