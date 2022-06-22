/* eslint-disable no-lonely-if */
import { useContext, useState, useRef, useEffect } from "preact/hooks";
import {  createContext } from "preact";
import { strFromU8, decompressSync } from "fflate"
import {APP_BASE_URL, MW_SERVER} from '../appcfg'

//---------- this module holds a lot of global data for the RNAseq part of the app --------
//same with loaded dtypes entries appended to ["rnaseq", "dnam" ] so far..
export const dtaDTypes=[] //to be populated with the loaded data allData.dtypes content - 0 based

// this should match, from 1 on, the wordy description of the dtaDTypes entries (at least) -- to be used in the dropdown menu!
export const dtaSelTypes=[ 'Brain Matrix', 'bulk RNAseq', 'DNA methylation', 'WGS', 'scRNAseq', 'long RNAseq', 'microRNA']
//                            0               1                2               3          4          5           6
// the above must match the order of entries in the NavHeader

export const rGlobs={
     selXType : 0, //currently targeted experiment/assay type + 1; 0 is the 'brain matrix', i.e. no selected data type
     prevSelXType : -1,
     dataLoaded : false,
     rebuildRMatrix: true
}

export const AGE_LAST_RANGE = 65;
//WARNING: the name index in each of reg, dx, dset arrays MUST
//match the numeric values in the dtaXall columns !
export const dtaNames = {
    reg : ['reg'], // push allData.regions[1] names
    regFull : ['regname'], // push allData.regions[2], i.e. their full names
    dx : ['dx' ], //push allData.dx names, index MUST match their IDs in the dtaXd[x] arr rows
    dxFull: ['dxname'],
    dset: [ ], /* an array of arrays of lists of all dataset names (for all experiment types)
                    with dataType prepended:
                  [
                    [ 1, rnaseq_dataset1, rnaseq_dataset2, ... ],
                    [ 2, dnam_dataset1, dnam_dataset2, ... ],
                  ]                                          */
    dsetp: [ ], /* like dset, this has an array of arrays of public flag lists for datasets per datatype
                     with dataType prepended:
                  [
                    [ 1, rnaseq_dataset1_public, rnaseq_dataset2_public, ... ],
                    [ 2, dnam_dataset1_public, dnam_dataset2_public, ... ],
                  ]
                  public flag is : allData.datasets[dataType][2] + 1 (so only has 1s and 2s)
                */
    dsetRef: [ ], /* reference paper/citation to show for each dataset
                  [
                    [ 1, rnaseq_dataset1_ref, rnaseq_dataset2_ref, ... ],
                    [ 2, dnam_dataset1_ref, dnam_dataset2_ref, ... ],
                  ]
                   */
    /* unused for now:
    dspub: [ 'dspub', 'restricted', 'public'],
    dspubIdx: {}, // { "restricted":1, 'public': 2 },
    */
    // hard-coded for now (an array for each xp type, like dset)
    proto: [ [1, 'PolyA', 'Ribo-Zero HMR', 'Ribo-Zero Gold'],
             [2, '450k', 'WGBS'],
             [3, 'WGS']
            ],
    // ---- experiment type independent:
    race : [ 'race' ], // other entries added when loading brains object
    //raceIdx : {} , // { "AA":1, "AS":2, "CAUC":3, "HISP":4 }, //other entries loaded when loading brains object
    sex : [ 'sex' ],
    //sexIdx : {}, //{ "F":1, "M":2 },
    //it should be assay type (atype) for DNAm data
    age: ['age', 'fetal',  '0-15',   '16-64',      '65+'],
    ageRanges:   [[0], [0.01, 15.99],[16, 64.99], [AGE_LAST_RANGE] ]
};

export function getDatasetCitation(xt, dix) {
  return dtaNames.dsetRef[xt][dix]
}

export function geProtoName(xt, pix) {
  return dtaNames.proto[xt][pix]
}
//map incremental indexes used here to database IDs - found in JSON file
export const allReg2db = ['reg'] // array of regions.id from db
export const allDx2db = ['dx'] // array of dx.id from db
export const allDset2db= [ ] //array of arrays of datasets.id per experiment type

// global data (unaffected by filters): -- ATTN: must be populated by loadData()
// all the demo data for each brain (with dtaNames indexes):
export const dtaBrains = [ ];
// array of [ brint,  dx-idx, race-idx, sex-idx, age, pmi, has_seq, has_geno, dropped ]
// bridx used anywhere else should match the index in this array, so dtaBrains[0] is always []
//    so actual data starts at dtaBrains[1] for bridx 1

//ref to hash mapping brint to its dtaBrains index { brint:bridx, ...}
export const dtaBrIdx = [{}]; // usage: dtaBrIdx[0][brint] => bridx (if found)

//dtXall is an array of arrays holding the fetched allData.sdata arrays,
//--- const [br-idx, sample_id, ds-idx, reg-idx, proto ] = dtXall[xt][sidx];
export const dtXall = [ ]; //clear this array in order to FORCE refetching the data
/*-------- 1st tier (directly fetched) -----
dtXall : arrays of experiment metadata (samples), one array of rows for each experiment type
  [
     [  //array with all rnaseq samples
      [sample_id, br-idx, reg-idx, ds-idx, proto-idx ],
       ...
     ],
     [  //array with all dnam samples
      [sample_id, br-idx, reg-idx, ds-idx, assay-type-idx ],
       ...
     ]
      Note: if rGlobs.selXType>0, dtXall[selXType-1] will have the sample data for the current datatype
  ]
*/

//array of [total samples, total brains] tuples, one for each dataype
export const smpBrTotals = []

// just a set of bridx for ALL sampled Brains (with at least 1 data point across all experiment samples)
export const XBrs = new Set();
// the set of bridx present in JSON brains but NOT having experimental samples at all
export const noXBrs = new Set(); //built from JSON brains removing any "seen" bridx in JSON sdata

//array of maps for bridx to array of sample indexes in dtaXall[dtype], for each datatype dtype
export const br2Smp= [] /* maps bridx
    [
      { // rnaseq samples hash
        bridx: [sample_id1, sample_id2, ...],
        bridx2:  [sample_id3, sample_id4, ...],
        ...
      },  // dna met samples hash
      { bridx: [sample_id1, sample_id2, ...],
        bridx2:  [sample_id3, sample_id4, ...]
        ...
      }
      ...
    ]
*/

//array of maps of sample_id to bridx (index in dtaBrains array) for each data type
export const smp2Br=[] //TODO: check if we REALLY need this?!
/*  [
      [ sample_id1: bridx, sample_id2:bridx2, ... ] // rnaseq samples
      [ sample_id1: bridx, sample_id2:bridx2, ... ] // dnam samples
    ...
    ]
*/

export const dtXsel = []; /* a dynamic array of arrays with FILTERED experiment samples metadata (tables)
 for EACH experiment type (if rGlobs.selXType==0), AFTER filtering with the current dtFilters
 0 .. xt arrays of arrays
  dtXsel [
    [ //rnaseq selected samples
      [ br_idx, sample_id, ds_idx, reg_idx, proto ],
       ...
    ],
    [  //dnam selected samples
      [ br_idx, sample_id, ds_idx, reg_idx, proto ],
       ...
    ],
    ... (xt)
  ]
  br_idx are indexes in dtaBrains, ds_idx is the index in corresponding dtaNames.dset[xt]
  So if rGlobs.selXType>0 then dtXsel[selXType-1] is the current selected samples array
  (the other entries will be undefined). So only when selXType is 0 all levels will be populated.
*/


//Initial (original) SAMPLE counts populated by loadData()
// reg, dx, dset, race, age, sex, proto : sample counts PER EXPERIMENT TYPE
// these counts are all extracted from allData.sdata when loaded
export const dtOriCounts = {
  reg: [ ], /* sample counts matrix:  region by datatype (one row per datatype, dtype prefixed)
             array of arrays of list of original counts for each region within a data type,
              with dataType+1 prepended:
            [ [0 ] -- just for consistency with dtBrOriCounts
              [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],
              [2, dnam_DLPFC_count, dnam_HIPPO_count, ...]
            ]
            IMPORTANT: the order of the counts must match exactly the order
                       of dtaNames.reg (sparse array)
            */
  dx: [ ],  /* same as reg: sample counts matrix: Dx by datatype (one row per datatype, dtype prefixed)
                 [ [0] -- just for consistency with dtBrOriCounts
                   [1, rnaseq_Control_count, rnaseq_SCZD_count, ...],
                   [2, dnam_Control_count, dnam_SCZD_count, ...]
                 ]
               */
  race: [ ], // same as dx, array of count lists per race for each experiment type
   sex: [ ], // same as dx, array of count lists per sex for each experiment type
   age: [ ], // same as dx, array of count lists per age bin for each experiment type
  //---------- experiment
  dset: [ ], /* an array of arrays of lists of all dataset counts (for all experiment types)
   with dataType prepended, mirror the structure of dtaNames.dset[] :
     [ [0]
       [ 1, rnaseq_dataset1_counts, rnaseq_dataset2_counts, ... ],
       [ 2, dnam_dataset1_counts, dnam_dataset2_counts, ... ],
     ]   */
  proto: [ ]  //same as dset, array of count lists per protocol
}

// --- initial SUBJECT counts from loaded data per Brain
// sampling-independent counts (or cross-xt counts) are in index 0 of each array
export const dtBrOriCounts = {
    reg: [ ], /* brain+region sampled counts matrix:  one row per datatype, dtype prefixed
             array of arrays of list of original counts for each brain+region combo
             within a data type,  with dataType+1 prepended.
             First record (index 0) has union counts per region across ALL experiment types!
            [ [0, all_DLPFC_count, all_HIPPO_count, ..]
              [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],
              [2, dnam_DLPFC_count, dnam_HIPPO_count, ...]
            ]
            IMPORTANT: the order of the counts must match exactly the order
                       of dtaNames.reg (sparse array)
            */
   dx: [ ],  /* same as reg: subject counts matrix: Dx by datatype
          [ [0, Control_count, SCZD_count], //sampling independent, includes non-sampled brains
            [1, rnaseq_Control_count, rnaseq_SCZD_count, ...],
            [2, dnam_Control_count, dnam_SCZD_count, ...]
          ]      */
   race: [ ], // same as dx, array of subj count lists per race for each experiment type
   sex: [ ], // same as dx, array of subj count lists per sex for each experiment type
   age: [ ], // same as dx, array of subj count lists per age bin for each experiment type
   /*
   //-------- used for selXType=0, cross-xtype counts for SUBJECTS
   //         (having at least 1 experiment sampled)
    Xreg: ['reg'], // counts of distinct brains sampled per region in ANY experiment type
     Xdx: ['dx'],  // push brain counts per dx for each dx idx (sparse array) (no seq data needed!)
   Xrace: ['race'],
    Xage: ['age'], // will push counts for each age bin in dtaAgeRanges
    Xsex: ['sex'], //+ F-counts, M-counts
    */
}

/* ----- also populated in loadData(), like dtOri*Counts:
// generic subject stats (independent of experimental data loaded, except .reg):
//  distribution by dx, race, sex, age bin
//this should be used instead as oriCounts in the getFilterData(showZero) for Brain Matrix
//   except dtBrStats.reg which always depends on experimental data points
export const dtBrStats = {
  reg: dtBrOriCounts.Xreg, //special: count distinct brains sampled per region, across all exp. types!!
  //---- the counts below are independent of experiment data - simple demo stats:
  dx: ['dx'], //push dx counts in the same order as dtaNames.dx
  race: ['race'], //push race counts in the same order as dtaNames.race
  age: ['age'], // will push counts for each age bin in dtaAgeRanges
  sex: ['sex'] //+ F-counts, M-counts
}
*/

//********* FILTERED SAMPLE COUNTS (depending on the active filters,
//**********    updated by updateCounts() with any filter change
//-- except for dtCounts.reg and .dx, the others are counts
//          for the currently targeted experiment type (selXType)
//     dtCounts.reg|dx have region|dx counts for each experiment datatype in the matrix!
// -- rebuilt in updateCounts()
export const dtCounts = {
    reg: [  ], // counts matrix:  region by datatype (one row per datatype, dtype prefixed)
     /* [ [0 ],
         [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],
         [2, dnam_DLPFC_count, dnam_HIPPO_count, ...]
       ] */
    //---- sample counts for current SelXType only (incl. 0 = Brain Matrix)
     dx: ['dx'],
   race: ['race'],
    age: ['age'], // will push counts for each age bin in dtaAgeRanges
    sex: ['sex'], //+ F-counts, M-counts
   // -- these are only used for SelXType>0 :
   proto: ['proto'], // counts by protocol for current XType
    dset: ['dset']  // dataset counts for current SelXType
    // dspub: ['dspub'], //will push counts for restricted and then public datasets
}

//******* FILTERED SUBJECT COUNTS -- for Brain Matrix (selXType=0)
//*******  after passing the filters (like dtCounts but by brint)
/*  except for index 0, these are sampling DEPENDENT - only counted if it has any xt samples!)
  index 0 can have sampling independent counts:
  reg[0] => has union counts across experiment types for each region
  dx[0] => has counts that includes non-sampled brains if with_seq is false !
*/
export const dtBrCounts = {
   reg: [ ], /* region by data type (one row per data type, each row dtype prefixed)
      First record (index 0) has union counts per region across ALL experiment types!
      [ [0 ] // dummy
        [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],
        [2, dnam_DLPFC_count, dnam_HIPPO_count, ...]
      ] */
   //-- these counts are for current SelXType only (including 0 -> Brain matrix)
     dx: ['dx' ],
   race: ['race'],
    age: ['age'], // hold counts per age bin in dtaAgeRanges for
    sex: ['sex'], //+ F-counts, M-counts

    // 2-dimensional cross-tabulation arrays, contingency tables
    // init by initBrCX() at each updateCounts()
    dx2cx: {},  //mapping dxid to column index in cxDx* tables
    cx2dx: {},  //mapping column index in cxDx* tables to dxid
    s2cx:  {}, //mapping sex/race idx to row index in cxDx* tables
    r2cx:  {},
    cx2s:  {}, //mapping row index in cxDx* table to sex/race idx
    cx2r:  {},
    cxDxSex: [], // crosstab counts Dx vs Sex   - initialized by initBrCX
    cxDxRace: [], // crosstab counts Dx vs Race  - initialized by initBrCX
    Brains: new Set() // set of brix passing the filters
 }

 export const dtBrXsel = dtBrCounts.Brains
 // set of bridx that passed the filters across all datasets [ br_idx1, br_idx2, ....]
 // only calculated across datasets in Brain Matrix mode (selXType is 0)



/* like dtCounts but for each category IGNORING self-referential filtering!
   (for FltMList or RMatrix) but reflecting the OTHER filters applied
  ATTN:  when selXType is 0 these are counting SUBJECTS (except for reg)
        across all exp. types (according to the filters)
*/
export const dtXCounts = {
    reg: [  ], // counts by region x datatype, each datatype row is dtype prefixed
    /* [ [0 ],
         [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],
         [2, dnam_DLPFC_count, dnam_HIPPO_count, ...]
    ] */
    //---- sample counts for current SelXType only (incl. 0 = Brain Matrix)
      dx: ['dx'],
    race: ['race'],
     age: ['age'], // will push counts for each age bin in dtaAgeRanges
     sex: ['sex'], //+ F-counts, M-counts
    // -- these are only used for SelXType>0 :
    proto: ['proto'], // counts by protocol for current XType
     dset: ['dset']   // counts by dataset for current SelXType
     // dspub: ['dspub'], //will push counts for restricted and then public datasets
}
/*
// Only for selXType=0, filtered non-self-referential SUBJECT counts
// =-----> to be used with getFilterData(showZero)
// which are counted INDEPENDENTLY of existence of experimental samples (except from reg)
// but only affected by other filters!
export const dtBrXCounts = {
   reg: dtXCounts.Xreg, //always sample dependent! (cannot be adjusted)
    dx: ['dx'],
  race: ['race'],
   age: ['age'],
   sex: ['sex']
} // note: race,age,sex shall be taken from dtXCounts in this case (selXType=0)
*/

/*  ------- filters reflect the selections in various FltMList ----
  Filters are generally sets of indexes in the various dta* arrays, except for the sex filter
    .reg :  Set[reg-idx-1, reg-idx-2, ...]
     .dx :  Set[ dx-idx-1, dx-idx-2, ...]
   .dset :  Set[ ds-idx-1, ds-idx-2, ... ]
    .age :  Set[ agebin-idx-1, agebin-2, .. ] set of indexes in dtAgeRanges
   .race :  Set[ race-idx-1, race-idx-2, ...]
    .sex :  Set[ sex-idx-1, ...]
    .proto: Set[ proto-idx-1, proto-idx-2, ..]
*/// -- filters, always dynamic, for the currently selected experiment type
export const dtFilters = {
   reg: new Set(),
    dx: new Set(),
    proto: new Set(), // 1, 2 , 3
   dset: new Set(),
   age: new Set(),
   ageRange: [], // when set and has exactly 2 values, overrides age Set!

   race: new Set(), //this has a set of race indexes
   sex: new Set(), //can have only one member: 1 or 2
   //--
   brSet:new Set(), //user provided list of bridx
   brXtX: new Set(),  //only used in Brain Matrix for brain set intersections
                    // across Data Types (also restrict by region if reg is set)
   //until cross-set intersection is implemented, brXtX only has 1 value in Brain Matrix mode
   //which is the current xdtype column where regions were selected & applied
   //TODO: ideally should be a set of tuples Set[xdtype1:region_Set, xdtype2:region_Set, ...]
   //      (when BtMatrix allows multi-Xdtype selection!)

   // --- for Brain Matrix: if either set to true, only brains with such data are counted
   with_seq: false, // only count brains with sequencing data
   with_gt: false // only  count genotyped brains
}
//=======================

const dtaAgeRanges=dtaNames.ageRanges;

export function haveBrListFilter() {
  return (dtFilters.brSet.size>0)
}
export function getBrListFilter() {
  return dtFilters.brSet
}
export function clearBrListFilter() {
  dtFilters.brSet.clear()
  updateCounts()
}

export function applyBrList(brlist) { //'Br'
  if (brlist.length==0) return 0;
  const bridxs=[]
  for (let i=0;i<brlist.length;i++) {
    let e=brlist[i]
    let v=parseInt(e.replace('Br',''))
    if (v>0) v=dtaBrIdx[0][v]; //map brint to brix
    if (v) bridxs.push(v)
  }
  if (bridxs.length==0) {
    return 0;
  }
  clearFilters(true)
  for(let i=0;i<bridxs.length;i++) {
     dtFilters.brSet.add(bridxs[i])
  }
  updateCounts()
  return bridxs.length
}

function age2RangeIdx(a) { //age is converted in a 1-based index into a dtaAge label index
  a=Math.floor(a * 10) / 10;
  if (a<0) return 1; //fetal
  if (a===0.0) return 2;
  let len=dtaAgeRanges.length;
  if (a>=AGE_LAST_RANGE) return len;
  --len;
  for (let i=1;i<len;++i) {
    let ar=dtaAgeRanges[i];
    if (a>=ar[0] && a<=ar[1]) return i+1;
  }
  return 0;
}

const ageWarn = (a,ctx) => {
  if (!ctx) ctx='[updateCounts]';
  console.log(`${ctx} WARNING: could not get an Age range index from age ${a}"`)
}

export function loadData(allData) {
  //const selXType=rGlobs.selXType; //loading data should NOT depened on selXType (only counts do)
  const numDataTypes=allData.dtypes.length;
  if (!numDataTypes) { console.log("FATAL ERROR: numDataTypes is zero!!!"); return }
  dtaDTypes.length=0;
  allData.dtypes.forEach( (e)=>{ dtaDTypes.push(e)} );

  console.log('[loadData] loading data..');

  //plain arrays loaded here:
  ['sex', 'race'].forEach( (e) => {
      let dtn=dtaNames[e];
      dtn.length=0; dtn.push(e);
      Array.prototype.push.apply(dtn, allData[e]);
  });
  //FIXME: patch long ancestry names:
  const nrace=dtaNames.race
  for (let i=1;i<nrace.length;i++) {
    if (nrace[i]=='Multi-Racial') nrace[i]='Multi'
    else if (nrace[i]=='Native American') nrace[i]='NA'
  }

  //reg JSON has counts per xdtype, dx JSON has SUBJECT counts per xdtype
  //>>>>> here we load dtOriCounts.reg[1..] and dtBrOriCounts.dx[1..]
  allReg2db.length=1;
  allDx2db.length=1;
  ['dx', 'reg'].forEach( (e) => {
      let dtn=dtaNames[e];
      let ef=`${e}Full`;
      let dtnf=dtaNames[ef];
      dtn.length=0; dtn.push(e);
      dtnf.length=0; dtnf.push(ef); //0      1       2        3
      let ld=allData[e]; //array of [idx, abbrev, fullname, dbid, count1, count2, ...]
      // will update dtOriCounts.reg|brDx from the JSON data itself
      let oric=null;
      let idx2db=null;
      if (e==='reg') {
          //load original region counts for each datatype (no need to calculate)
          idx2db=allReg2db;
          oric=dtOriCounts.reg;
          oric.length=0;
          for (let i=0;i<=numDataTypes;i++)
            oric.push([i]); //push only list head for each datatype list including reg[0]
      } else { //dx : counts of subjects sampled per each exp datatype are given
        idx2db=allDx2db;
        oric=dtBrOriCounts.dx;
        oric.length=0;
        for (let i=0;i<=numDataTypes;i++)
          oric.push([i]); //push only list head per each exp datatype list
        //also prep dtBrOriCounts.dx[0] here: 0-init dx[0], to be counted later
        ld.forEach( () => oric[0].push(0) )
      }
      ld.forEach(  (it) => {
        if (dtn.length!==it[0]) console.log(`Error: index mismatch loading ${e} data`);
        dtn.push(it[1]);
        dtnf.push(it[2]);
        idx2db.push(it[3]);
        if (oric) for (let i=1;i<=numDataTypes;i++)
             oric[i].push(it[3+i]);
      })
  })
  //-- special case: loading datasets, their public/restricted status and original counts
  const ds=dtaNames.dset
  const dsp=dtaNames.dsetp //public status info (1 or 2) for each dataset
  const dsref=dtaNames.dsetRef
  ds.length=0; dsp.length=0; dsref.length=0;

  let ld=allData.datasets;
  if (ld.length!==numDataTypes) //sanity check:
      console.log("[loadData] Error: allData.dset len ", ld.length, " not ", numDataTypes)
  allDset2db.length=0;

  // >>>>> populating dtOriCounts.dset[]
  const dsoc=dtOriCounts.dset; dsoc.length=0;
  dsoc.push([0]);
  const dproto=dtaNames.proto //FIXME: already populated (hard-coded) for now
  const poc=dtOriCounts.proto; poc.length=0;
  poc.push([0]) //placeholder poc[0]=[0]

  for (let i=1;i<=numDataTypes;i++) {
      ds.push([i]); //push only list head for each datatype list
      dsp.push([i]); //push only list head for each datatype list
      dsref.push([i]);
      allDset2db.push([i]);
      const j=i-1;
      dsoc[i]=[i]
      ld[j].forEach( (it)=>{ // [idx, name, public status (0/1), dbid, sample_count, ref-citation]
        ds[j].push(it[1]);   //   0    1        2                 3     4               5
        dsoc[i].push(it[4]); //store sample count for this xtype and dataset?
        dsp[j].push(it[2]+1); // public_status+1
        dsref[j].push(it[5]); // ref citation
        allDset2db[j].push(it[3]); //save the dset.id from database
      })
      //zero-prep proto data
      poc[i]=[i]  //poc[i].length=dproto[j].length
      let z=dproto[j].length;
      while (--z) poc[i].push(0)
   }
  //-- load brains
  dtaBrains.length=0; // array of [ brint,  dx#, race#, sex#, age, pmi, has_seq, has_geno, dropped ]
  dtaBrains.push([]); //to make brain indexes start at 1 and match dtaBrains array idx
  dtaBrIdx.length=0;  //cleared, array which has just 1 hash mapping a brint to a dtaBrains index

  // --- dtOriCounts, dtBrOriCounts: clear/prep multi-dimenional count arrays
  // NOTE: dtBrOriCounts.dx[1..] already populated with per XType counts
  //reset count arrays here so we can update dt*OriCounts when loading samples
  // -- also dtOriCounts (except .reg), dtBrOriCounts (except .dx) to be filled now
  // --- multi-dimensional counts:
  //           dtOriCounts   :    dx, race, sex, age  (reg, dset already filled)
  //           dtBrOriCounts :   reg, race, sex, age  (dx already filled )
  ['dx', 'reg', 'race', 'sex', 'age'].forEach( (f)=>{
      let n=dtaNames[f].length
      const arr = (f==="reg"  ?  [ dtBrOriCounts[f] ] : (f==="dx" ?
                 [ dtOriCounts[f] ] : [dtBrOriCounts[f], dtOriCounts[f] ]) )
      arr.forEach( (dt) => {
        if (dt) {
          dt.length=0
          for (let i=0;i<=numDataTypes;i++) {
            let z=n; dt[i]=[]
            dt[i].length=n; dt[i][0]=i;
            while (--z) dt[i][z]=0;
          }
      }
     })
  });
    /* // this was just done above ----
  ["dx", "reg", "race", "sex", "age"].forEach( (e)=>{
    let z=dtaNames[e].length;
    const arr = (e==="reg"  ?  [ dtBrOriCounts[e] ] : (e==="dx" ?
                 [ dtOriCounts[e] ] : [dtBrOriCounts[e], dtOriCounts[e], ]) );
    arr.forEach( (oc)=> {
       let n=numDataTypes;
       oc.length=n;
       while (n--) {
          oc[n]=[n+1]; oc[n].length=z;
          let i=z;  while(i--) oc[n][i]=0;
       }
    })
  }); */
  // -- dtBrStats[fid] is now dtBrOriCounts[fid][0]
  const stDx=dtBrOriCounts.dx[0], stAge=dtBrOriCounts.age[0],
     stRace=dtBrOriCounts.race[0], stSex=dtBrOriCounts.sex[0];
  //>>>>>> loading dtBrOriCounts.{dx,age,race,sex}[0] (btBrStats) except .reg
  //  also dtaBrains, dtaBrIdx[0] hash
  const br2idx={};
  dtaBrIdx.push(br2idx);
  noXBrs.clear();
  allData.brains.forEach( (bd)=>{
    const [idx, brint, dxi, ri, si, age, pmi, hasSeq, hasGt, drop]=bd;
    if (dtaBrains.length!==idx) {
       //console.log();
       throw new Error(`[loadData] Error: brain index ${idx} mismatch (${dtaBrains.length})`);
    }
    noXBrs.add(idx); //will remove later after seen in JSON sdata
    dtaBrains.push([brint, dxi, ri, si, age, pmi, hasSeq, hasGt, drop]);
    br2idx[brint] = idx;
    if (!drop) {
      //update dtBrOriCounts:
      let ax=age2RangeIdx(age);
      if (ax===0) ageWarn(age); else stAge[ax]++;
      stDx[dxi]++;
      //if (!stDx[0]) {
      //  console.log("Error: invalidated sdDx[0] for brain entry: ", bd);
      //}
      stSex[si]++;stRace[ri]++;
    }
  });

  //now load allData.sdata
  for (let i=0;i<dtXall.length;i++) dtXall[i].length=0;
  dtXall.length=0;
  smpBrTotals.length=0;
  br2Smp.length=0;
  smp2Br.length=0;
  dtXsel.length=0; //clear this array of arrays

  /*
  const ocproto=dtOriCounts.proto;
  //never initialized before, do it here
  ocproto.length=numDataTypes;
  for (let i=0;i<numDataTypes;i++) {
    let n=dtaNames.proto[i].length
    ocproto[i]=[]
    ocproto[i].length=n
    ocproto[i][0]=[i+1]
    while (--n) ocproto[n]=0;
  }
  */

  const brXregoc=dtBrOriCounts.reg[0];
  /* dtBrOriCounts.dx[0] and other Xstats already populated
  const brXraceoc=dtBrOriCounts.race[0];
  const brXageoc=dtBrOriCounts.age[0];
  const brXsexoc=dtBrOriCounts.sex[0];
  */
  const XBrRegs = [] // keep brix.'_'.regix across ALL xt data
    // across all datatypes (so this counts only brains with experimental data!)
  XBrs.clear();

  allData.sdata.forEach( (xtdata, ix) => {
    dtXsel.push([]); //clear selection
    dtXall.push( xtdata ); //collecting data for all sample types, as is
    const b2s={}; //using {} to make sure bridx is converted to string as key
    br2Smp.push(b2s);
    const s2b=[];
    smp2Br.push(s2b);
    // for region counts:
    const xtBrRegs=[] //distinct brix.'_'.regix for this xtype
    const xtix=ix+1
    //-- these are sample counts spread by per experimental type
    const dxoc=dtOriCounts.dx[xtix]
    const raceoc=dtOriCounts.race[xtix]
    const sexoc=dtOriCounts.sex[xtix]
    const ageoc=dtOriCounts.age[xtix]

    const protooc=dtOriCounts.proto[xtix]
    // dtOriCounts.reg were loaded earlier from xdata.reg

    //-- these are subject counts spread by per experimental type
    const bdxoc=dtBrOriCounts.dx[xtix]
    const braceoc=dtBrOriCounts.race[xtix]
    const bsexoc=dtBrOriCounts.sex[xtix]
    const bageoc=dtBrOriCounts.age[xtix]
    const bregoc=dtBrOriCounts.reg[xtix]

    let brXTCounted={}; //hash to determine uniqueness of bridx per this exp.type
           // use to populate btBrOriCounts.(dx,sex,race,age) for the current datatype
    let brCount=0
    xtdata.forEach( (sd, si)=> { // [ bridx, sample_id, dsidx, regidx, protoidx ]
      const [bridx, sid, , rg, p]=sd;
      s2b[sid]=bridx; //should be a single brain, duh
      let smps=b2s[bridx];
      if (!smps) { smps=[]; b2s[bridx]=smps }
      smps.push(si);
      //if (xtix===0)
      protooc[p]++;
      // -- update dtOriCounts.dx sample counts:
      const [ , dxi, raidx, sidx, age, pmi, hasSeq, hasGt, drop ] = dtaBrains[bridx];
      // never count dropped brains!
      if (!drop) {
        let ax=age2RangeIdx(age);
        dxoc[dxi]++;
        raceoc[raidx]++;
        sexoc[sidx]++;
        ageoc[ax]++;
        if (!XBrs.has(bridx)) {
          XBrs.add(bridx);
          // also remove it from noXBrs !
          noXBrs.delete(bridx);
          /* already populated earlier?
          brXdxoc[dxi]++; //counts per dx of brains having ANY experimental data
          brXageoc[ax]++;
          brXraceoc[raidx]++;
          brXsexoc[sidx]++;
          */
        }
        if (!brXTCounted[bridx]) { //counts for this exp type
          brCount++
          brXTCounted[bridx]=1;
          bdxoc[dxi]++;
          braceoc[raidx]++;
          bsexoc[sidx]++;
          bageoc[ax]++;
        }
        // region counts assessed separately
        const brreg=`${bridx}_${rg}`;
        if (!xtBrRegs[brreg]) {
          xtBrRegs[brreg]=1;
          bregoc[rg]++;
        }
        if (!XBrRegs[brreg]) {
          XBrRegs[brreg]=1;
          brXregoc[rg]++;
        }
     }
    });
    //smpBrTotals.push([xtdata.length, Object.keys(b2s).length]);
    smpBrTotals.push([xtdata.length, brCount]);
  });
 // free memory from loaded/fetched JSON bulk data
  allData.sdata=[];
  allData=null; //GC should clean up
  rGlobs.prevSelXType=-1; //force populating dtOriCounts.(age|race|sex)
  updateCounts();

  rGlobs.dataLoaded=true;
   // returns [ the selected experiment type, list of samples for the current exp type,
    //   counts data (dtCounts.reg has the whole region matrix data!) ];
    //rGlobs.rebuildRMatrix=true;
  return [ dtXsel, dtCounts, dtBrCounts, true ];
}

// not used by BrMatrix
//return count data for a Set filter - array of arrays specifically for FltMList
export function getFilterData(fid) {
    //TODO: shall we handle with_* conditions to return some counts here?
  //const showZero=!dtFilters.with_seq
  //inf Brain Matrix (selXType=0), dtFilters
  // to show all available subjects (using dtBrStats for oriCounts)
  const xt=rGlobs.selXType;
 /* This function returns data to be displayed in a FltMList control
    returns an array of items data, each row is an array:
     [ itemLabel, itemBadgeValue, lockStatus, dtaNames[fid] index, itemOrigCounts, tooltip_fullname ]
  The list should have only items with itemOrigCounts > 0
  Note that itemBadgeValue is taken from dtXCounts so self-filtering is avoided
*/
  //console.log(`getFilterData for ${fid} called`);
  if (!rGlobs.dataLoaded) return [];

  const rdata=[]; //returning data here a list of items data
  const seqfid = (fid==='dset' || fid==='proto')
  if (xt===0 && seqfid)
      throw new Error(`getFilterData(${fid}) should NOT be called with 0 selXType`)
    //console.log(`Error: getFilterData(${fid}) should NOT be called with 0 selXType`);
    //return rdata; }

  //let xt=selXType ? selXType-1 : 0;

  const fltNames = (seqfid) ? dtaNames[fid][xt-1] : dtaNames[fid];
  if (!fltNames || fltNames.length<2)
      //   throw new Error(`Error: could not find data for filter name "${fid}"`);
     throw new Error(`[getFilterData]: no names data found for filter name "${fid}" (selXType=${xt})`);
     //return rdata;  }
  //const arrFid=( fid === 'reg' || fid === 'dx');
  const arrFid = ( fid === 'reg' )
  const fullNames = ( arrFid || fid==='dx' ) ? dtaNames[`${fid}Full`] :
           new Array(fltNames.length).fill('') ;
  //console.log(`[getFilterData] called with fid=${fid} (selXType=${selXType})`);
  //these will be arrays of multi-data in case of reg and dx
  let oriCounts=null, fltXCounts = null;
  /* if (fid==='dset' || fid==='proto') { // xt>0 only
      oriCounts=dtOriCounts[fid][xt-1];
      fltXCounts=dtXCounts[fid];
  } else { */
      oriCounts = xt? dtOriCounts[fid][xt] : dtBrOriCounts[fid][0];
      fltXCounts= ( arrFid ? dtXCounts[fid][xt] : dtXCounts[fid]);
  //}
  const fltPubStatus = (fid==="dset" ? dtaNames["dsetp"][xt-1] : []);
  if (fltPubStatus.length===0) { //make a dummy array
      fltPubStatus.length=fltNames.length; //all undefined
  }
  if (fltNames.length!==fltXCounts.length || fltXCounts.length!==oriCounts.length)
      throw new Error(`[getFilterData ${fid}]: fltNames(${fltNames.length}), fltXCounts(${fltXCounts.length}) and oriCounts(${oriCounts.length}) must be equal length!`);
  //   [ itemLabel, itemBadgeValue, lockStatus, dtaNames[fid] index, itemOrigCounts, tooltip_fullname ]
  // only returns items with oriCounts non-zero
  //const trimZ =(fid==='dx' || fid==='race')
  // && !(trimZ && fltXCounts[i]===0 && i>4)
  fltNames.forEach( (n,i)=> {
    if (i && oriCounts[i]>0 ) {
      rdata.push([n, fltXCounts[i], fltPubStatus[i], i, oriCounts[i], fullNames[i]]);
    }
  })
  return rdata;
}

//-- retrieve filter set - just a reference to the
export function getFilterSet(fid) {
  const fltSet=dtFilters[fid] //this MUST be a Set !
  if (fltSet==null)
     throw new Error(`Error: cannot get filter set for "${fid}"`)
  return fltSet
}

//simply return a boolean value (for with_seq , with_gt)
export function getFilterCond(fid) {
  const fltcond=dtFilters[fid] //this MUST be a Set !
  if (fltcond==null || typeof fltcond !== 'boolean')
     throw new Error(`Cannot get filter set for "${fid}"`)
  return fltcond
}


//simply call updateCounts, the filter sets in dtFilters were already set!
//should be called by onApply() of FltMList, set filters are already applied
//
  export function applyFilterSet(fid) {
  if (fid==='reg') {
    console.log("WARNING: brXtX filter cleared, did you mean that? *************")
    dtFilters.brXtX.clear() //CHECKME ??
  }
  updateCounts()
}

// -- this must set the dtFilters AND call updateCounts()
// call with (-1, -1) to disable the custom age range

export function applyFilterAgeRange(amin, amax) {
  if (typeof amin==='undefined') {
    //when called without params, dtFilters.ageRange was already updated
    updateCounts()
    return
  }
  const fltAgeRange=dtFilters.ageRange
  let upd=false
  const doclear=((amin===-1 && amax===-1) ||
                  (amin==-1 && amax==120))
  if (fltAgeRange.length==2) {
        upd=(amin!==fltAgeRange[0] || amax!==fltAgeRange[1])
        if (doclear) fltAgeRange.length=0
            else {
              fltAgeRange[0]=amin
              fltAgeRange[1]=amax
            }
   } else { //must be empty
      if (!doclear) {
         fltAgeRange.push(amin, amax)
         upd=true
      }
    }
  if (upd) {
    //console.log("~~~~~~ AgeRange filter updated:", fltAgeRange)
    updateCounts()
  }
  return (!upd)
 }



export function getFilterAgeRange() {
   /*const ar=dtFilters.ageRange
   if (ar.length==2)  {
      return([ar[0], ar[1]])
   }
   return([])
   */
  return dtFilters.ageRange
}

// these two function also call updateCounts() if the range was not preserved
export function switchAgeBinToRange() {
    //it maybe the case that there is no selection in age bins because
    // we already have the ageRange (and this is the first switch after a page rebuild)
    if (dtFilters.ageRange.length==2) return true;
    let upd=false;
    const abins=dtFilters.age
    if (abins.size==0) {
       dtFilters.ageRange.length=0
       return(true) //no need to update
    }
    //only map if a single interval is selected
    if (abins.size==1) {
        const v=abins.values().next().value
        if (v===1) {
             dtFilters.ageRange.length=0
             dtFilters.ageRange.push(-1, 0)
        } else if (v===dtaNames.ageRanges.length) {
          dtFilters.ageRange.length=0
          dtFilters.ageRange.push(AGE_LAST_RANGE, 120)
        } else {
          const ar=dtaNames.ageRanges[v-1]
          dtFilters.ageRange.length=0
          dtFilters.ageRange.push(Math.trunc(ar[0]), Math.trunc(ar[1]))
        }
        //console.log("ageRange set to:", dtFilters.ageRange)
    } else {
       //just reset it
       upd=true
       dtFilters.ageRange.length=0
    }
    dtFilters.age.clear()
    if (upd) updateCounts()
    return (!upd) //let the caller know if clean conversion failed and filter was cleared
}

export function switchAgeRangeToBin() {
  // if this is called after a page rebuild, nothing should happen:
  if (dtFilters.age.size) return true;
  let upd=false
  if (dtFilters.ageRange.length==0) return true
  //return false if no exact match was possible, age filter was cleared and updateCounts() was called
  const abins=dtaNames.ageRanges
  const numBins=dtaNames.ageRanges.length
  const [amin, amax]=dtFilters.ageRange
  //if (amin<0)
  //  console.log(" switchToRangeBins: received:", dtFilters.ageRange)

  //if (amin==-1 && amax==0) {
  //only basic single interval conversion
  if (amin<=-0.76 && amax==0) { //
      dtFilters.age.add(1)
  } else if (amin==65 && amax>110) {
    const bin=dtaNames.age.length()-1
    dtFilters.age.add()
  } else {
    for (let i=1;i<numBins-1;i++) {
       if (amin==Math.trunc(abins[i][0]) &&
             amax==Math.trunc(abins[i][1])) {
               dtFilters.age.add(i+1)
               break
             }
    }
  }
  dtFilters.ageRange.length=0
  if (dtFilters.age.size==0) {  //could not find a match
      upd=true
      updateCounts()
  }
  return (!upd)
}

//booleans are set with checkbox -- value must be provided here:
export function applyFilterCond(cond, val) {
   if (!(cond in dtFilters))
      throw new Error(`applyFilterCond(${cond}) invalid property `)
   if (typeof dtFilters[cond] !== 'boolean')
      throw new Error(`applyFilterCond(${cond}) not a boolean property`)
   if (typeof val==='undefined')
     throw new Error(`applyFilterCond(${cond}, ?) requires a value`)
   dtFilters[cond] = val
   updateCounts()
}

// apply filter from an array to the corresponding dtFilters set
// used only by RMatrix only at this point
export function applyFilterData(fid, fArr, xtx) {
  const fltSet=dtFilters[fid];
  if (fltSet==null)
     throw new Error(`Error: cannot applyFilterData for "${fid}"`);
  //console.log(`Applying filter set for "${fid}": (${fArr})`);
  fltSet.clear(); //clear previous state
  fArr.forEach( o => fltSet.add(o) );
  //xtMain is now only used for the region filter in Brain Matrix
  // where it is the currently selected column (experiment type: 1-based)

  if (fid==='reg') dtFilters.brXtX.clear()
  // --- only the Brain matrix uses this code:
  if (xtx) { //in the future this could be an array of values
    // we could use Array.isArray(xtMain) here to check
    // for now it must be a 1-based xtype index
     dtFilters.brXtX.add(xtx-1) //note: 0-based xt is stored!
  }
  updateCounts();
}

//returns a boolean if ANY filters are set (except the raw ones like genotyped/sequenced)
export function anyActiveFilters(ignoreSeqGeno) {
    for (const key in dtFilters) {
        if (!Object.prototype.hasOwnProperty.call(dtFilters, key)) continue;
        if (key==='ageRange') {
           if (dtFilters[key].length===2) return true;
        } else if (key.startsWith('with_') && !ignoreSeqGeno) { //condition filter - only makes sense for Brain Matrix!
            if (rGlobs.selXType===0 && dtFilters[key]) return true;
        } else  { //must be a set!
            //TODO: only check if the current set makes sense for the current selXType
            // if ( key in xtFltSets[rGlobs.selXType] )
              if (dtFilters[key].size) return true;
        }
    }
    return false;
}

export function clearFilters(noupdate) { //reset (empty) filters
  for (const key in dtFilters) {
    if (!Object.prototype.hasOwnProperty.call(dtFilters, key)) continue;
    if (key==='ageRange') {
       dtFilters[key].length=0
      } else if (key.startsWith('with_')) { //condition filter
        dtFilters[key]=false
      } else { //must be a set
          dtFilters[key].clear();
         //console.log(`..clearing filter ${key}`)
      }
  }
  if (!noupdate) updateCounts();
  // remember to call notifyUpdate
}

export function clearAgeBinFilter() {
  dtFilters.age.clear()
  updateCounts()
}

//const dtaRaceIdx=dtaNames.raceIdx; //maps race literal to index
//const dtaSexIdx=dtaNames.sexIdx; //maps sex literal to index
//const dsetIdx=dtaNames.dsetp; //maps dataset index to dtCounts.dspub[] index (1 or 2)

//bitmasks for filter

const fltbit_Dx    = 1;
const fltbit_Reg   = 1<<1;
const fltbit_Race  = 1<<2;
const fltbit_Dset  = 1<<3;
const fltbit_Proto = 1<<4;
const fltbit_Sex   = 1<<5;
const fltbit_Age   = 1<<6;
//const fltbit_Dspub = 1<<7;
const fltbit_Seq   = 1<<8;
const fltbit_Geno  = 1<<9;


export function changeXType( newXType=0, forceUpdate=false ) {

  rGlobs.selXType=newXType;
  // clear filters?
  if (forceUpdate || newXType!=rGlobs.prevSelXType) updateCounts();
}

let br_dx2cx, br_cx2dx, br_cxDxSex, br_cxDxRace,
     br_s2cx, br_r2cx, br_cx2s, br_cx2r,
     brCountsDx, brCountsAge,
     brCountsRace, brCountsSex


function initBrCounts() { //before counting (updateCounts)
      dtBrCounts.dx2cx= { }
      dtBrCounts.cx2dx= { }   //mapping dx idx to/from cxDx* row idx
      dtBrCounts.s2cx = { } //mapping sex/race idx to column index in cxDx* tables
      dtBrCounts.r2cx = { }
      dtBrCounts.cx2s = { } //mapping column index in cxDx* table to sex/race idx
      dtBrCounts.cx2r = { }
      dtBrCounts.cxDxSex.length=0 // crosstab counts Dx vs Sex   (table)
      dtBrCounts.cxDxRace.length=0 // crosstab counts Dx vs Race  (table)
      //dtBrCounts.Brains.clear()
      dtBrXsel.clear()
      br_dx2cx=dtBrCounts.dx2cx, br_cx2dx=dtBrCounts.cx2dx,
      br_cxDxSex=dtBrCounts.cxDxSex, br_cxDxRace=dtBrCounts.cxDxRace,
      br_s2cx=dtBrCounts.s2cx, br_r2cx=dtBrCounts.r2cx,
      br_cx2s=dtBrCounts.cx2s, br_cx2r=dtBrCounts.cx2r
      brCountsDx=dtBrCounts.dx
      brCountsAge=dtBrCounts.age
      brCountsRace=dtBrCounts.race
      brCountsSex=dtBrCounts.sex
      // reg reset:
      const numDataTypes=dtaDTypes.length;
      let z=dtaNames.reg.length,  n=numDataTypes+1, oc=dtBrCounts.reg
      oc.length=n
      while (n--) {
        oc[n]=[n]; oc[n].length=z
        let i=z;  while(i--) oc[n][i]=0
      }
      ["dx", "age", "sex", "race"].forEach( (f)=>{
        let n=dtaNames[f].length, dt=dtBrCounts[f]
        dt.length=n; dt[0]=f
        while (--n) dt[n]=0;
      })

}

 //add a subject that passed the filters to the cxDx data
 //NOTE: MUST be called only once per brix that passed the filters
 export function updateBrCounts(brix, dxi, s, r, ax) {
   if (dtBrXsel.has(brix)) return false //brain already counted
   dtBrXsel.add(brix)
    // -- add dx row if needed
   let d = br_dx2cx[dxi]
   let dc=br_cxDxSex.length, sc=Object.keys(br_s2cx).length, rc=Object.keys(br_r2cx).length
   if (!(d>=0)) { //new dx row to add and fill with 0
     br_dx2cx[dxi]=dc
     br_cx2dx[dc]=dxi
     d=dc
     br_cxDxSex.push(Array(sc).fill(0))
     br_cxDxRace.push(Array(rc).fill(0))
   }
   [ [br_s2cx, br_cx2s, br_cxDxSex, sc, s], [br_r2cx, br_cx2r, br_cxDxRace, rc, r] ].forEach(el => {
     let [f2cx, cx2f, cxDxf, fc, fi]=el;
     let i=f2cx[fi] //get array index from feature index
     if (!(i>=0)) { //new column to be added (and filled with 0)
        f2cx[fi]=fc
        cx2f[fc]=fi
        i=fc
        cxDxf.forEach( dl => dl.push(0) )
     }
     if (! cxDxf[d])
       console.log("brix=",brix, "   d=", d,  "   cxDxf=", cxDxf)
     cxDxf[d][i]++
   });
   brCountsDx[dxi]++
   brCountsRace[r]++
   brCountsSex[s]++
   if (ax) brCountsAge[ax]++

   return true // new brain added to the set
 }

export function updateCounts() {
  //fills all dtn* arrays according to the dtf* filters
  const numDataTypes=dtaDTypes.length;
  const selXType=rGlobs.selXType;
  let selXTypeChanged=false;
  if (selXType!=rGlobs.prevSelXType) {
      selXTypeChanged=true;
      rGlobs.prevSelXType=selXType;
  }
   //reset multi-dimensional counts, set length and zero-fill:

    let z=dtaNames.reg.length;
    [ dtCounts.reg, dtXCounts.reg ].forEach( (oc)=>{ //dtBrCounts[e] as well
      let n=numDataTypes+1;
      oc.length=n;
      while (n--) {
         oc[n]=[n]; oc[n].length=z;
         let i=z;  while(i--) oc[n][i]=0;
      }
    });

  // proto counts are a special thing that only dtCounts and dtXCounts have
  // single dimensional counts:
  ["dx", "age", "sex", "race"].forEach( (f)=>{
    let n=dtaNames[f].length;
    [ dtCounts[f], dtXCounts[f] ].forEach( (dt) => { // same for dtBrCounts[f]
        if (dt) { //some may be null/undefined
          let z=n;
          dt.length=n; dt[0]=f;
          while (--z) dt[z]=0;
        }
      })
  });


  initBrCounts() // reset dtBrCounts - keep track of brains passing the filters

  let XtX=-1; // for now in Brain Matrix mode only one xtype is allowed in dtFilters.brXtX
  // this also determines if the region filter is checked in Brain Matrix mode
  // XtX remains -1 if no region filter was applied
  const selType0 = (selXType===0);
  const xtiList=[] // list of experiment data dype sets of samples to filter
  // if selXType, this just has selXType-1
  // if Brain Matrix mode this has all 3, with the brXtX one first
  dtXsel.length=0;


  //console.log(`--------- [updateCounts] called with brSet filter of size:`, dtFilters.brSet.size)
  const ageRangeFilter=dtFilters.ageRange.length==2 ? dtFilters.ageRange.slice() : null;
  if (ageRangeFilter) {
    if(ageRangeFilter[0]>=0) {
        //must be integer values, but the upper boundary should be set to NN.99
        //if (ageRangeFilter[0]==0) ageRangeFilter[0]=0.001
        ageRangeFilter[1]=Math.trunc(ageRangeFilter[1])+0.99
    } else { // fetal range
      if (ageRangeFilter[1]===0) ageRangeFilter[1]=-0.001
    }
    //console.log(" updateCounts() age Range filter set to:", ageRangeFilter)
  }

  if (selXType) { //specific data type selected, not Brain Matrix
      XtX=selXType-1;
      xtiList.push(selXType-1); //only this sample list is going to be scanned
      //dset init & clear:
      let dt=dtCounts.dset, dtx=dtXCounts.dset, z=dtaNames.dset[selXType-1].length;
      dt.length=dtx.length=z;
      dt[0]=dtx[0]='dset';
      while(--z)  { dt[z]=0; dtx[z]=0; }
      //proto init & clear
      dt=dtCounts.proto, dtx=dtXCounts.proto, z=dtaNames.proto[selXType-1].length;
      dt.length=dtx.length=z;
      dt[0]=dtx[0]='proto';
      while(--z)  { dt[z]=0; dtx[z]=0; }

  } else {
    //in Brain Matrix mode, we're still scanning all the xt sample lists
    // in order to build the region matrices per each xptype
    ["reg"].forEach( (f)=>{
      let n=dtaNames[f].length;
      const arr=[ dtBrCounts[f][0], dtXCounts[f][0] ];
      //if (f==='dx') arr.push(dtBrXCounts.dx);
      arr.forEach( (dt) => {
          if (dt) { //some may be null/undefined ?
            let z=n;
            dt.length=n; dt[0]=0;
            while (--z) dt[z]=0;
          }
        })
      });
     const xc=dtFilters.brXtX.size;
     let xi=0;
     if (xc) { //assume xt type (0-based) is the first/only element
         if (xc>1) throw new Error('Error: multiple intersection data types not implemented yet!');
         //get the first (and only for now) value
         XtX=dtFilters.brXtX.values().next().value; //get first item
         console.log(">>>> brXtX filter:", XtX)
         //scan the targeted XType for intersection FIRST
         for (xi=0;xi<numDataTypes;xi++) if (xi===XtX) { xtiList.push(XtX); break }
         for (xi=0;xi<numDataTypes;xi++) if (xi!==XtX) xtiList.push(xi);
     } else { // no brXtX filter specified at all (which at this time means no region filter!)
       for (xi=0;xi<numDataTypes;xi++)  xtiList.push(xi); //just the default order
     }
    }

  // Scan sample lists (all data types when selXType is 0 !!!)
  dtBrXsel.clear() //clear the set of bridx selected across all experiment types
  const dtBrAllseen=new Set() // set of checked bridx across samples
  // this should be used to prevent double counting of
  // demo data in Brain Matrix mode (selType0)

  const brSet=dtFilters.brSet; //brnum list filter requested
  const haveBrSet = (brSet.size>0) //use provided BrNum list ?
  // for Brain Matrix,  region counts across experiments
  const XBrRegs = [] // brix.'_'.regix set across ALL data types (selType0 only)

  //const dtBrXCountsReg=dtXCounts.reg[0] //brain_region counts across all exp types
  //const dtBrCountsXReg=dtBrCounts.reg[0]
  // -------------- checking samples for each exp data type in xtiList (just 1 if selXType)
  //console.log('xtList : ', xtiList)
  const dtCountsDx=dtCounts.dx;
  const dtCountsSex=dtCounts.sex;
  const dtCountsAge=dtCounts.age;
  const dtCountsRace=dtCounts.race;
  const dtCountsDset=dtCounts.dset;
  const dtCountsProto=dtCounts.proto;
  //console.log(`DLPFC dtXCounts.reg[${xt}] before update: ${dtXCountsReg[1]}`)
  const dtXCountsDx=dtXCounts.dx;
  const dtXCountsAge=dtXCounts.age;
  const dtXCountsRace=dtXCounts.race;
  const dtXCountsSex=dtXCounts.sex;
  const dtXCountsDset=dtXCounts.dset;
  const dtXCountsProto=dtXCounts.proto;

  for (let xjj=0; xjj<xtiList.length; xjj++) {
    const xt=xtiList[xjj]; //current experiment type processed (0-based value)
    const sdta=dtXall[xt];
    if (!sdta || sdta.length==0) {
      console.log(`[updateCounts] Error: no sample data found for data ${dtaDTypes[xt]}`);
      continue;
    }
    // for region counts:
    const xtBrRegs=[] //distinct brix.'_'.regix for this xtype
    const dtCountsReg=dtCounts.reg[xt+1];
    const dtXCountsReg=dtXCounts.reg[xt+1];
    const dtBrCountsReg=dtBrCounts.reg[xt+1] //updateBrCounts() does NOT update regs

    //when selXType===0, we are in Brain Matrix mode, so all rows in these multi-dtype arrays are updated:
    //    brCounted, dtCounts.reg, dtXCounts.reg, dtBrCounts.reg
    //    ALSO - no region filters are checked EXCEPT for the dtFilters.brXtX data type (xt===brXtX)

    // -- when selXType>0, we could just have the [xt] of all the above updated

    // in that case, dtXCounts will hold SUBJECT counts instead of sample counts
    //    and region x datatype value in the matrix shows the count of distinct subjects
    //    having samples from that region and that datatype

    // only if first seen, the subject will be counted in dtXCounts.reg (if selXType==0) and dtBrCounts.reg

    //const brCounted={} // only used for unique phenotype features (i.e. no region counts) for this xt
        // if first seen, a subject will counted in dtXCounts (if selXType==0) and dtBrCounts

    dtXsel[xt]=[]; //clear selected data to refill

    const len=sdta.length;
    const rrix=dtFilters.reg.values().next().value
    //console.log(`~~~~~~~~~~~~~ updateCounts() -- for xt ${xt}`)

    for (let i=0;i<len;++i) { //for each sample data row
        const [ brix, sid, ds, rg, p ] = sdta[i];
        //brSet is the custom provided set of brain indexes (e.g. from a BrNum list upload)
        if (haveBrSet && !brSet.has(brix))  //hard skip of samples from this brain not in the user given set!
                  continue;
        //* another fast rejection is in Brain Matrix mode if XtX >= 0 (intersection mode)
        //     if xt!=XtX, it means btBrAllsel is already LOCKED IN by the first xt pass before this
        // i.e. no new brains are allowed to pass the filters, hence no new samples from those brains are counted
        if (selType0 && XtX>=0 && XtX!=xt && !dtBrXsel.has(brix))
               continue;
        const [ , dx, r, s, a, pmi, seq, gt, drop ] = dtaBrains[brix];
        if (drop) continue // NEVER count dropped brains!

        //another hard skip is if with_seq or with_gt are set and this entry doesn't have it
        if (dtFilters.with_seq && !seq) continue;
        if (dtFilters.with_gt && !gt) continue;

        // custom Age Range rejection filter
        if (ageRangeFilter && (a<ageRangeFilter[0] || a>ageRangeFilter[1])) continue;

        let ax=0;

        let filterBits=0;

        //NOTE: we only check the region filter in single Xt mode
        //      or in Brain Matrix when a region was indeed selected!
        if (xt===XtX && dtFilters.reg.size && !dtFilters.reg.has(rg))
          filterBits |= fltbit_Reg;

        if (dtFilters.dx.size && !dtFilters.dx.has(dx))
          filterBits |= fltbit_Dx;

        if (dtFilters.race.size && !dtFilters.race.has(r))
          filterBits |= fltbit_Race;

        if (dtFilters.sex.size && !dtFilters.sex.has(s))
           filterBits |= fltbit_Sex;

        if (selXType) {
          if (dtFilters.dset.size && !dtFilters.dset.has(ds))
           filterBits |= fltbit_Dset;

          if (dtFilters.proto.size && !dtFilters.proto.has(p))
           filterBits |= fltbit_Proto;
        }
        //let ax=0;
        if (dtFilters.age.size) { //any age filter set?
           if (ax===0) ax=age2RangeIdx(a);
           if (ax===0) ageWarn(a);
              else  //else if (a<0) console.log(`for ${sid} age ${a} got ax=${ax}`);
                 if (!dtFilters.age.has(ax))
                    filterBits |= fltbit_Age;
        }

        //first time seeing this Br?
        let newXBr = !dtBrAllseen.has(brix)
        //for region counts:
        const brreg=`${brix}_${rg}`
        const newBrReg=!xtBrRegs[brreg]; // new br-reg combo for this xtype
        // --only for SelType0
        //const newXBrReg=!XBrRegs[brreg]; // new br-region combo across ALL data - do we care?

        // when to count the this brain demo?
        const cntItX=(selXType || newXBr)
        // when to count/check this region samples?
        const cntReg=(selXType || newBrReg);
        //const cntRegX=(selXType || newXBrReg);
        //always count regions
        if (filterBits) { // FAILED the filters
          //still count in case of failing ONLY due to self-filters!
          if ( (filterBits === fltbit_Reg)  && cntReg ) {
            dtXCountsReg[rg]++;
            xtBrRegs[brreg]=1;
          }
          if (cntItX) {
            let u=0;
            switch (filterBits) {
                case fltbit_Dx: dtXCountsDx[dx]++; u|=1; break
                case fltbit_Dset: if (selXType) { dtXCountsDset[ds]++; u|=1 } break
                case fltbit_Proto: if (selXType) { dtXCountsProto[p]++; u|=1 } break
                case fltbit_Age:  if (ax===0) ax=age2RangeIdx(a)
                                  if (ax) dtXCountsAge[ax]++
                                  u|=1
                                  break
                case fltbit_Race: dtXCountsRace[r]++; u|=1; break
                case fltbit_Sex:  dtXCountsSex[s]++; u|=1; break
            }
            if (newXBr && u) dtBrAllseen.add(brix)
          }
          continue; //bail out, not passing filters
        }

        // ---   passed the filters -- update counts for each category
        dtCountsReg[rg]++; //count samples in this region for this xt
        if (cntReg) dtXCountsReg[rg]++; //count samples from this brain in this region for this xt

        if (newBrReg) { // new br-reg combo for this xt
          dtBrCountsReg[rg]++; //counts distinct brains sampled in this region for this xt
          xtBrRegs[brreg]=1;
        }

        if (cntItX) { //count unique or single-xt demo entries
          dtCountsDx[dx]++;
          dtXCountsDx[dx]++;

          dtCountsRace[r]++;
          dtXCountsRace[r]++; //dtBrXallCountsRace[r]++;

          dtCountsSex[s]++
          dtXCountsSex[s]++  //dtBrXallCountsSex[s]++;

          if (selXType) {
            dtCountsDset[ds]++; dtXCountsDset[ds]++;
            dtCountsProto[p]++; dtXCountsProto[p]++;
          }
          if (ax===0) ax=age2RangeIdx(a);
          if (ax===0) ageWarn(a);
             else {
                dtCountsAge[ax]++;
                dtXCountsAge[ax]++;
             }
          //if (newXBr) { //br first seen across all/this data xtype
          if (updateBrCounts(brix, dx, s,  r, ax)) {
            dtBrAllseen.add(brix) // across ALL data types
          }
        }

        // sample passed the filters:
        dtXsel[xt].push([ brix, sid, ds, rg, p ]);
      }
    //console.log(` ------------ S[${xt}] counts:`, dtXsel[xt].length, dtBrXsel.size,
    //                  dtXCounts.sex[1], dtXCounts.sex[2], dtBrCounts.sex[2])
    //show counts for HIPPO reg (regix=2):
   /*
    console.log(`xt ${xt} DLPFC dt(Smp)Counts[xt]/dtXCounts[xt]/dtBrCounts[xt] : `,
      dtCountsReg[1], dtXCountsReg[1], dtBrCountsReg[1], dtBrXCountsReg[1])

    console.log(`xt ${xt} HIPPO dt(Smp)Counts[xt]/dtXCounts[xt]/dtBrCounts[xt]/dtBrXCountsXreg : `,
          dtCountsReg[2], dtXCountsReg[2], dtBrCountsReg[2], dtBrXCountsReg[2])
   */
   /* DEBUG: consistency check for this data type:
     console.log(`Set ${xt} (${len} samples): `)
    let stSums= [dtCountsDx, dtCounts.sex, dtCounts.age,  dtCountsReg].map( x => {
     let s=0; x.forEach( (e,i)=>{  if (i) s+=e; }); return s;
     });
     console.log("sum(dtCountsDx, dtCounts.sex, dtCounts.age,  dtCountsReg) = ", stSums);
   */
   } // for each xdatatype

   //return [selXType, dtXs, dtCounts ]
   //now update dtBrXCounts with all the noXBrs that pass the filters (add them to all arrays)
   if (selType0 && XtX<0)
     noXBrs.forEach( (brix)=>{
       const [ , dx, r, s, a, pmi, seq, gt, drop ] = dtaBrains[brix];
        if (drop) return //NEVER count dropped brains
        //another hard skip is if with_seq or with_gt are set and this entry doesn't have it
       if (dtFilters.with_seq && !seq) return;
       if (dtFilters.with_gt && !gt) return;
       if (haveBrSet && !brSet.has(brix))  //!!! absolute skip, not on the list
                      return; //exit this arrow function iteration (i.e. like continue)
       if (ageRangeFilter && (a<ageRangeFilter[0] || a>ageRangeFilter[1])) return;
       let ax=0;
       let filterBits=0;

       if (dtFilters.dx.size && !dtFilters.dx.has(dx))
         filterBits |= fltbit_Dx;

       if (dtFilters.race.size && !dtFilters.race.has(r))
         filterBits |= fltbit_Race;

       if (dtFilters.sex.size && !dtFilters.sex.has(s))
         filterBits |= fltbit_Sex;
       if (dtFilters.age.size) { //any age filter set?
          if (ax===0) ax=age2RangeIdx(a);
          if (ax===0) ageWarn(a);
             else  //else if (a<0) console.log(`for ${sid} age ${a} got ax=${ax}`);
               if (!dtFilters.age.has(ax))
                   filterBits |= fltbit_Age;
       }
       if (filterBits) {
          switch (filterBits) {
              case fltbit_Dx: dtXCountsDx[dx]++; break;
              case fltbit_Age: if(ax) dtXCountsAge[ax]++; break;
              case fltbit_Race: dtXCountsRace[r]++; break;
              case fltbit_Sex: dtXCountsSex[s]++; break;
          }
       } else { //passed the filters!
         dtXCountsDx[dx]++;
         dtXCountsRace[r]++;
         if (ax===0) ax=age2RangeIdx(a);
         dtXCountsSex[s]++;
         if (ax===0) ageWarn(a);
            else dtXCountsAge[ax]++;
         updateBrCounts(brix, dx, s, r, ax)
       }

     })
  //console.log(dtXCounts.proto);
}

//simply return the names of datasets in the filter
// for the current experiment type
export function getSelDatasets() {
   const dsnames=[]
   if (rGlobs.selXType===0) return dsnames;
   if (dtFilters.dset.size===0) return dsnames;
   const xt=rGlobs.selXType-1
   dtFilters.dset.forEach( di => {
     dsnames.push(dtaNames.dset[xt][di])
   })
   return dsnames
}

//get non-zero non-filtered regions and their counts for the current exp type
export function getRegionCounts() {
   const regdata=[] // array of [regname, smpcount]
   if (rGlobs.selXType===0) return regdata;
   const xt=rGlobs.selXType;
   if (dtFilters.reg.size) {
    dtFilters.reg.forEach( ri => {
       const rc=dtCounts.reg[xt][ri];
       if (rc>0) regdata.push( [dtaNames.reg[ri], rc])
    })
   } else { //no region filter, show all non-zero
      dtCounts.reg[xt].forEach((rc, ri) => {
        if (rc>0) regdata.push( [dtaNames.reg[ri], rc])
      })
   }
   return regdata
}

export function getBrSelData(showSmpCounts) {
//returns an array with rows of data for brains in dtBrAllsel
// if showSmpCounts is an array, it has experiment data types
//      to report sample counts for (0 based), e.g. [0, 1] for RNASeq, DNAmet
  const rows=[]
  let extraCols=0;
  const hdr=['BrNum', 'Dx', 'Race', 'Sex', 'Age', 'PMI'] //, 'Dropped'];
  if (Array.isArray(showSmpCounts)) {
    extraCols=showSmpCounts.length
    for (let i=0;i<extraCols;i++)
      hdr.push(dtaDTypes[showSmpCounts[i]]+'_samples')
  }
  // array of [brnum, dx, race, sex, age, pmi, numsmpxt1, ... ]
  rows.push(hdr)
  dtBrXsel.forEach( brix => {
     const [brint, dxix, raix, six, age, pmi]=dtaBrains[brix]
     //this DOES list dropped brains
     const row=[`Br${brint}`, dtaNames.dx[dxix],
        dtaNames.race[raix], dtaNames.sex[six], age, pmi]

     if (extraCols)
       for (let i=0; i<extraCols; i++) {
         let xt=showSmpCounts[i];
         let s = br2Smp[xt];
         let nums = 0;
         if (s && s[brix])
           nums=s[brix].length;
         row.push(nums);
       }
    rows.push(row)
  })
  return rows
}


const RDataCtx = createContext();
const RDataUpdateCtx = createContext();

// [dtXsel, dtCounts, dtBrCounts, rGlobs.dataLoaded ]
export function useRData() {  return useContext(RDataCtx) }
export function useRDataUpdate() {  return useContext(RDataUpdateCtx) }

export function RDataProvider( {children} ) {
  //rcData is [ dtXs, dtCounts, dtBrCounts ]
  const [rcData, setRData] = useState([ dtXsel, dtCounts, dtBrCounts, rGlobs.dataLoaded ]);
  // const [query, setQuery] = useState('all_rnaseq.meta.json.gz');
  //-------------- client-side fetch is built in the browser
  // the assets/ bundled url is for development only
  // normally data should be fetched using axios => useSWR() from the node server
  //TODO: fetch this from the NODE server instead of the bundled data

  //const [datasrc, setDataSrc] = useState(APP_BASE_URL+'/multi_dta.json.gz');
  const [datasrc, setDataSrc] = useState(APP_BASE_URL+'data/multi_dta.json.gz');

  function updateRData(durl, dta) {
      //console('>>>> [RDataProvider.updateRData] called!')
      setDataSrc(durl);
      setRData(dta);
  }

  const fetchZjson = async (url) => {
    const jres =  await fetch(url, { mode: 'cors'})
    const ctype=jres.headers.get('Content-Type')
    // console.log("[",APP_BASE_URL,"] url=",url," content type : ", ctype)
    if (ctype=="application/json") {
        return JSON.parse(await jres.text());
    }
    let compr = new Uint8Array(await jres.arrayBuffer())
    //console.log("Compressed len: ", compr.byteLength);
    const decompr = decompressSync(compr);
    //console.log("Decompressed len: ", decompr.byteLength);
    const str = strFromU8(decompr);
    //console.log("str=", str.substr(0,200))
    return JSON.parse(str);
  }

  useEffect( () => {
    //no need to load unless allXData is clear
    //if (dtXall.length>0 && xdType===rGlobs.selXType ) return;
    //if (dtXall.length>0) return; //no need to load everything again unless dtXall was cleared!
    fetchZjson(datasrc)
      .then(  res => {
        console.log("fetching all sample data");
        setRData(loadData(res));
     } )
    .catch(error => console.log(error));
  }, [datasrc]);
  //TODO: how is updateXDType() called?
  return (
    <RDataCtx.Provider value={rcData}>
      <RDataUpdateCtx.Provider value={updateRData}>
      {children}
      </RDataUpdateCtx.Provider>
    </RDataCtx.Provider>
  );
}

export function useFirstRender() {
  const isFirstRef = useRef(true);
  useEffect(() => {
    isFirstRef.current = false;
  }, []);
  return isFirstRef.current;
}

const FltCtx = createContext();
const FltCtxUpdate = createContext();

export function useFltCtx() {
    const ctx=useContext(FltCtx);
    //making sure this is not used outside a provider
    if (ctx === undefined) {
        throw new Error(`useFltCtx must be used within FltCtxProvider!`)
    }
    return ctx;
}
export function useFltCtxUpdate() {
    const ctx=useContext(FltCtxUpdate);
    //making sure this is not used outside a provider
    if (ctx === undefined) {
        throw new Error(`useFltCtxUpdate must be used within FltCtxProvider!`)
    }
    return ctx;
}

export function FltCtxProvider (props) {
    // fltUpdated is [fltId, fltFlip]
    // so notifyFltChange is just a state change notifier and
    // should be called after calling updateCounts(fltId)
    // so dtCounts global object should have been updated already
    const [fltUpdInfo,  notifyFltChange] = useState([null, false])

    //console.log(`FltCtxProvider state change (${fltUpdInfo})`);
    /*if (fltUpdInfo) {
      const [fltUpdId, fltFlip] = fltUpdInfo;
    }*/

    //-- this should be called by the context consumer (filter being changed)
    //   to signal an update of dtCounts after that filter is applied
    function filterUpdated(fId) { //flip update and set fId
      //console.log(`FltCtxProvider: requested update of [${fltUpdInfo}] by "${fId}"`);
      notifyFltChange( s => [ fId,  !s[1]]);
    }
    //if (!fltUpdInfo) return null;

    return (
     <FltCtx.Provider value={fltUpdInfo}>
         <FltCtxUpdate.Provider value={filterUpdated}>
             {props.children}
         </FltCtxUpdate.Provider>
     </FltCtx.Provider>
    )
}

//////////////  --- data prep & fetching functions:
export async function checkGeneList(glst, annotation) {
  if (!annotation) annotation='Gencode25'
	const reqOpts = {
		   method: 'POST',
		   headers: { 'Content-Type': 'application/json' },
		   body: JSON.stringify({ dtype: 'genelist', annset: annotation, genelist: glst })
  };
  //console.log(" -- sending req body:", reqOpts.body)
  return fetch(`${MW_SERVER}/pgdb/gcheck`, reqOpts)
}

export async function buildRSE(f_name, sarr, feat, assayType='counts', fext, glst) {
	// params: file prefix, array of sample_IDs, ftype ('g', 't', 'e', 'j')
	if (!feat) feat='g' //feature type
  //if (!glst)
  let lstgenes=glst.join()
	feat=feat.charAt(0).toLowerCase()
	if (feat=='t') assayType='tpm'
	const reqOpts = {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ type: 'rna', fname: f_name,  feature:feat, samples:sarr,
                           genes: lstgenes,
                           filetype:fext,
                           dtype:assayType })
  };
  //console.log(" -- sending req body:", reqOpts.body)
  return fetch(`${MW_SERVER}/pgdb/adl`, reqOpts)
}

export async function saveRStagedFile(relpath, newfname) {
  const a = document.createElement('a');
  //make sure relpath replaces / with | :
  relpath=relpath.replace(/\//g, '|')
  a.href = `${MW_SERVER}/rstaging/${relpath}`;
  if (newfname && newfname.length) {
     //NOTE: download attribute only honored for links to resources with the same origin !!
     a.download = newfname;
  }
  //a.addEventListener('click', () => {
  //  setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000); //prevent timeout?
  //});
  document.body.appendChild(a); //FF needs this
  a.click();
  //a.remove();
  document.body.removeChild(a); //FF needed this
}
