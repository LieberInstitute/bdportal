# Release notes: 2026-09-14 dev deployment (devel branch)

Deployed to `http://srv16.lieber.local/dev/bdportal/` with its own middleware
(`bdportal-server-dev.service`, port 4097). Production `/bdportal` untouched.

## Data (public/data/multi_dta.json.gz)

| | previous (2023-era bundle) | this release |
| --- | ---: | ---: |
| subjects (brains) | 3226 | 3696 |
| subjects with NDA GUID | 3 | 163 |
| rnaseq datasets / samples | 11 / 6491 | 12 / 7376 |
| dnam_450k samples | 1074 | 1074 |
| dnam_WGBS samples | 2737 | 2737 |
| wgs samples | 108 | 108 |
| dx categories | 25 | 26 (UnspecDepr added) |

- AANRI rnaseq dataset (885 samples, DLPFC/HIPPO, RiboZeroGold) from the
  2026-09-10/12 ETL; sample IDs are `RNum_flowcell_L###`.
- VA_PTSD sample IDs renamed to `RNum_flowcell_L###` (1280 samples).
- 470 new subjects from the Neuropath export; 22 DepNOS subjects moved to
  the new `UnspecDepr` dx.
- NDA pseudo-GUIDs loaded into `subjects.nda_guid` from
  `dbwrk/GUIDs/master_brnum_guid_current.tab` (163 rows; Br6423 corrected
  from NDAR_INVCH371AU1 to NDAR_INVEJ479WEA). Backup of prior values:
  `dbwrk/worklog/nda_guids_2026-09-14/subjects_nda_guid_before.tab`.
- Ten `not-in-LIMS` placeholder subjects (NULL race/sex) are excluded.

## Generator (dnam-pull4webapp.pl)

- Excludes subjects lacking race/sex instead of dying; warnings for unmapped
  enum values, typeless datasets, samples of excluded subjects.
- Deterministic dtype order; JSON string escaping; numeric slot validation;
  atomic write with JSON::PP validation; stderr summary; default server
  `localhost`; `-h` usage.

## Infrastructure

- New `bdportal-server-dev.service` (Node 22, port 4097) serving
  `/dev/bdportal/api/` (nginx snippet updated; backup
  `/etc/nginx/snippets/app_dirs.conf.<timestamp>.bak`).
- `nginx/bdportal-api-locations.conf` template updated to match.
- Root and `server/` `node_modules` refreshed with `npm ci` (Vite 7.3.3,
  jsonwebtoken 9).

## Open items

- WebAuth certificate at 192.168.77.16:6443 expired 2026-04-28; login fails
  on prod and dev until renewed.
- Production middleware still runs the old `server.js` on Node 18; promote
  after dev testing (see `docs/deployment.md`).
- Portal does not yet show dataset subsets (PTSD years) or sequencing
  provenance.
