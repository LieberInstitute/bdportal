# Refreshing the bundled metadata

The browser loads `public/data/multi_dta.json.gz` at startup (see
`RDataProvider` and `loadData()` in `src/comp/RDataCtx.jsx`). It is generated
from the `rse` PostgreSQL database by `dnam-pull4webapp.pl`.

## Command

Run on srv16 (or any host whose `~/.pgpass` has an `rse` entry for the
server), from the repo root:

```bash
./dnam-pull4webapp.pl -o public/data/multi_dta.json          # default server: localhost
gzip -9 -f public/data/multi_dta.json                         # -> multi_dta.json.gz
```

With `-o`, the script writes `file.tmp`, parses it back with `JSON::PP`,
checks that every top-level array is present and that `datasets`/`sdata`
have one entry per data type, then renames it into place. A failed run leaves
no partial output under the final name. Warnings and a summary (brains,
GUID count, regions, dx, samples per data type) go to stderr.

## JSON shape

```
dtypes   [ "rnaseq", "dnam_450k", "dnam_WGBS", "wgs" ]  (rnaseq first, then alphabetical)
mod, sex, race   category name arrays (index = position + 1)
datasets [ per dtype: [ ord, name, public, dbid, sample_count, refs ] ]
reg      [ ord, name, fullname, dbid, count_per_dtype... ]   (regions with any samples)
dx       [ ord, dx, name, dbid, subject_count_per_dtype... ] (all dx rows)
brains   [ ord, brint, guid, dx#, race#, sex#, age, pmi, mod#, has_seq, genotyped, dropped ]
sdata    [ per dtype: [ br_ord, sample_id, dataset_ord, reg_ord, proto ] ]
```

`proto` for rnaseq is 1 PolyA, 2 RiboZeroHMR, 3 RiboZeroGold, 0 unknown
(must match `dtaNames.proto`); other data types use 1.

## Data rules enforced by the generator

- Dropped samples and samples of dropped subjects are excluded from `sdata`
  and all counts; dropped subjects still appear in `brains` with `dropped=1`.
- Subjects with NULL `race` or `sex` are excluded from `brains` (and their
  samples from `sdata`) with a warning. These are placeholder records such as
  the ten `xdata='not-in-LIMS'` genotyped brains (Br0927, Br1091, ...). Fix
  such records upstream in dbwrk if they should ever carry data.
- A race/sex/MoD value missing from the script's index tables (enum change)
  skips the subject with a warning instead of aborting; update the tables.
- A dataset whose derived type is NULL (a `dnam` dataset without
  `datasets.info` = `450k`/`WGBS`) is reported and skipped.
- A sample referencing a dataset or region that produced no entry aborts the
  run (database inconsistency).
- Strings are JSON-escaped; unquoted slots must be numeric.

## Upstream (dbwrk)

Database and RSE store changes come from `~/work/R/dbwrk` (`rse_ETL.R`,
`add_or_update_BrNums.R`, `update_seq_provenance.R`, `GUIDs/load_nda_guids.sql`).
See its `README.md`, `docs/RNA-Seq_ETL.md` and `docs/RNA-Seq_provenance.md`.
Schema columns added since the 2023 bundle that the portal does not yet use:
`dataset_subsets`/`exp_rnaseq.subset_id` (PTSD_BrainOmics years, AANRI),
`exp_rnaseq.seq_provenance` (JSONB), `subjects.rin`.

## Sanity check against the previous bundle

```bash
node -e '
const fs=require("fs"),z=require("zlib");
const j=JSON.parse(z.gunzipSync(fs.readFileSync("public/data/multi_dta.json.gz")).toString());
console.log(j.dtypes, j.datasets.map(a=>a.length), "brains", j.brains.length,
  "guids", j.brains.filter(b=>b[2]).length, "samples", j.sdata.map(a=>a.length));'
```
