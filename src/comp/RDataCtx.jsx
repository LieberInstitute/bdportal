import { useContext, useState, useRef, useEffect } from "preact/hooks";
import {  createContext } from "preact";
import { strFromU8, decompressSync } from "fflate";

//---------- this module holds a lot of global data for the RNAseq part of the app --------

//same with loaded dtypes entries appended to ["rnaseq", "dnam" ] so far..
export const dtaDTypes=[] //to be populated with the loaded data allData.dtypes content - 0 based



// this should match, from 1 on, the wordy description of the dtaDTypes entries (at least) -- to be used in the dropdown menu!
export const dtaSelTypes=[ 'Brain Matrix', 'bulk RNA-seq', 'DNA methylation', 'WGS', 'scRNAseq', 'long RNAseq', 'microRNA']
//                            0               1                2               3          4          5           6
// the above must match the order of entries in the NavHeader

export const rGlobs={
     selXType : 0, //currently targeted experiment/assay type + 1; 0 is the 'brain matrix', i.e. no selected data type
     prevSelXType : -1,
     dataLoaded : false,
     rebuildRMatrix: true
}

export const mxMaxVal = 546;

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
    /* unused for now:
    dspub: [ 'dspub', 'restricted', 'public'],
    dspubIdx: {}, // { "restricted":1, 'public': 2 }, 
    */
    //hard-coded 1,2,3 for RNAseq data only (could be an array for each xp type, like dset)
    proto: [ 'protocol', 'PolyA', 'Ribo-Zero HMR', 'Ribo-Zero Gold'], 

    // ---- experiment type independent:
    race : [ 'race' ], // other entries added when loading brains object
    //raceIdx : {} , // { "AA":1, "AS":2, "CAUC":3, "HISP":4 }, //other entries loaded when loading brains object
    sex : [ 'sex' ],
    //sexIdx : {}, //{ "F":1, "M":2 },
    //it should be assay type (atype) for DNAm data
    age: ['age', 'fetal', '0-15', '16-64',  '65+'], 
    ageRanges: [[0], [0.01,15.9],[16,64.9], [AGE_LAST_RANGE] ]
};

//map incremental indexes used here to database IDs - found in JSON file
export const allReg2db = ['reg'] // array of regions.id from db
export const allDx2db = ['dx'] // array of dx.id from db
export const allDset2db= [ ] //array of arrays of datasets.id per experiment type 

// global data (unaffected by filters): -- ATTN: must be populated by loadData()
// all the demo data for each brain (with dtaNames indexes):
export const dtaBrains = [ ];  // array of [ brint,  dx-idx, race-idx, sex-idx, age, dropped ]
// a brix should match the index, so dtaBrains[0] is always [], real data starts at dtaBrains[1]

//ref to hash mapping brint to its dtaBrains index { brint:bridx, ...}
export const dtaBrIdx = [{}]; 

//dtXall is an array of arrays holding the fetched allData.sdata arrays, 
//--- const [br-ix, sample_id, ds-ix, reg-ix, proto ] = dtXall[xt][si];
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
export const br2Smp= [] /*
    [  
      { bridx: [sample_id1, sample_id2, ...],
        bridx2:  [sample_id3, sample_id4, ...],
        ...
      },     // rnaseq samples hash
      { bridx: [sample_id1, sample_id2, ...],
        bridx2:  [sample_id3, sample_id4, ...] 
        ...
      }     // dnam samples hash
      ...
    ]
*/

//array of maps of sample_id to bridx (index in dtaBrains array) for each data type
export const smp2Br=[] //TODO: check if we REALLY use this?!
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

export const dtBrXsel = [] /* in Brain Matrix mode: array of Sets of brains that PASSED the filters,
  one Set for each exp. data type: [  Set(br_idx, ... ),   Set(br_idx, ...), ... ]
  Note that if dtFilters.brXtx has any entries, this set is built by 
  checking the region filter only if the current xt is in dtFilters.brXtx
   */

export const dtBrAllsel = new Set() // union of dtBrXsel sets into a 
// single set of bridx selected across all datasets [ br_idx1, br_idx2, ....]
// only calculated across datasets when selXType is 0

//Initial (original) SAMPLE counts populated by loadData()
// reg, dx, dset, race, age, sex, proto : sample counts PER EXPERIMENT TYPE
// these counts are all extracted from allData.sdata when loaded
export const dtOriCounts = {
  reg: [ ], /* sample counts matrix:  region by datatype (one row per datatype, dtype prefixed)
             array of arrays of list of original counts for each region within a data type,
              with dataType+1 prepended:
            [ [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],  
              [2, dnam_DLPFC_count, dnam_HIPPO_count, ...] 
            ]
            IMPORTANT: the order of the counts must match exactly the order 
                       of dtaNames.reg
            */                          
  dx: [ ],  /* same as reg: sample counts matrix: Dx by datatype (one row per datatype, dtype prefixed)
                 [ [1, rnaseq_Control_count, rnaseq_SCZD_count, ...],  
                   [2, dnam_Control_count, dnam_SCZD_count, ...] 
                 ]
               */
  dset: [ ], /* an array of arrays of lists of all dataset counts (for all experiment types)
                with dataType prepended, mirror the structure of dtaNames.dset[] :
                  [  
                    [ 1, rnaseq_dataset1_counts, rnaseq_dataset2_counts, ... ],
                    [ 2, dnam_dataset1_counts, dnam_dataset2_counts, ... ],
                  ]   */
  race: [ ], // same as dx, array of count lists per race for each experiment type
   sex: [ ], // same as dx, array of count lists per sex for each experiment type
   age: [ ], // same as dx, array of count lists per age bin for each experiment type
 proto: ['proto']  // for now only used for RNASeq data, so keep it simple
}

// initial SUBJECT counts from loaded data per Brain, SAMPLE DEPENDENT, only sampled brains 
//           i.e. having at least one experimental data point loaded
// use when selXType is 0 (Brain Matrix)
export const dtBrOriCounts = {
    reg: [ ], /* sample counts matrix:  region by datatype (one row per datatype, dtype prefixed)
             array of arrays of list of original counts for each brain+region within a data type,
              with dataType+1 prepended:
            [ [1, rnaseq_DLPFC_count, rnaseq_HIPPO_count, ...],  
              [2, dnam_DLPFC_count, dnam_HIPPO_count, ...] 
            ]
            IMPORTANT: the order of the counts must match exactly the order 
                       of dtaNames.reg
            */                          
   dx: [ ],  /* same as reg: subject counts matrix: Dx by datatype
          [ [1, rnaseq_Control_count, rnaseq_SCZD_count, ...],  
            [2, dnam_Control_count, dnam_SCZD_count, ...] 
          ]      */
   race: [ ], // same as dx, array of subj count lists per race for each experiment type
   sex: [ ], // same as dx, array of subj count lists per sex for each experiment type
   age: [ ], // same as dx, array of subj count lists per age bin for each experiment type
   //-------- used for selXType=0, cross-xtype counts for SUBJECTS
   //         (having at least 1 experiment sampled)
    Xreg: ['reg'], // counts of distinct brains sampled per region in ANY experiment type
     Xdx: ['dx'], 
   Xrace: ['race'],
    Xage: ['age'], // will push counts for each age bin in dtaAgeRanges
    Xsex: ['sex'], //+ F-counts, M-counts  
}


// ----- also populated in loadData(), like dtOri*Counts:
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

//-- dynamically updated sample COUNTS, depending on the filters
//-- except for dtCounts.reg and .dx, the others are counts 
//          for the currently targeted experiment type (selXType) 
//     dtCounts.reg|dx have region|dx counts for each experiment datatype in the matrix!
// -- rebuilt in updateCounts()
export const dtCounts = {
    reg: [  ], // counts matrix:  region by datatype (one row per datatype, dtype prefixed)
     dx: [ ],  // counts matrix: dx by datatype (one row per datatype, dtype prefixed)
     proto: ['proto'], // counts by protocol 
   dset: ['dset'],  // dataset counts by protocol 
 // dspub: ['dspub'], //will push counts for restricted and then public datasets
   race: ['race'],
    age: ['age'], // will push counts for each age bin in dtaAgeRanges
    sex: ['sex'] //+ F-counts, M-counts
}

// -- for selXType=0, brains passing the filters, similar to dtCounts but per subject
//    (still samples DEPENDENT - only counted if it has any xt samples!)
// -- samples from the same brain only counted once
// -- repopulated in updateCounts():
export const dtBrCounts = { 
  reg: [  ], // region by data type (one row per data type, each row dtype prefixed)
   dx: [  ], // dx by data type (one row per data type, each row dtype prefixed)
  race: ['race'],
   age: ['age'], // hold counts per age bin in dtaAgeRanges
   sex: ['sex'], //+ F-counts, M-counts
   // cross-exp.datatype counts of all subjects per reg and dx:
   Xreg: ['reg'], // counts of distinct brains sampled per region in ANY experiment type
   Xdx: ['dx'] // counts of distinct brains sampled per dx in ANY experiment type
 }
 
/* counts for each category IGNORING self-referential filtering! 
   (for FltMList or RMatrix)   but reflecting the OTHER filters applied
  ATTN:  when selXType is 0, these are SUBJECT counts but ONLY COUNTING SAMPLED subjects 
             i.e. subjects having AT LEAST 1 experimental data point !  
    also when selXType is 0, race,age,sex,Xreg,Xdx subjects 
         are counted across ALL sample types */
export const dtXCounts = { 
  reg: [  ], // counts by region x datatype, each datatype row is dtype prefixed
  dx:  [  ], // counts by dx x datatype, each datatype row is dtype prefixed
  proto: ['proto'], // counts by protocol/assay type 
  dset: ['dset'],  
   //dspub: ['dspub'], //will push counts for restricted and then public datasets
  race: ['race'],
  age: ['age'], // will push counts for each age bin in dtaAgeRanges
  sex: ['sex'], //+ F-counts, M-counts
  // -- only when selXType is 0, for fltMList display (not for RMatrix):
  Xreg: ['reg'], // subject counts per sampled region across ALL data types (sample DEPENDENT)
  Xdx: ['dx'] // subject counts per dx, across all datasets 
}

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

/*  ------- filters reflect the selections in various FltMList ----
  Filters are generally sets of indexes in the various dta* arrays, except for the sex filter
    .reg :  Set [reg-code-1, reg-code-2, ...]
     .dx :  Set[ dx-code-1, dx-code-2, ...] 
   .dset :  Set[ ds-code-1, ds-code-2, ... ]
    .age :  [ age-range-idx-1, age-range-idx-2,  .. ] set of indexes in dtAgeRanges
   .race :  Set[ "AA", "CAUC", ...] 
    .sex :  '', 'F'  or 'M' 
*/// -- filters, always dynamic, for the currently selected experiment type
export const dtFilters = {
   reg: new Set(),
    dx: new Set(),
    proto: new Set(), // 1, 2 , 3
   dset: new Set(),
   //dspub: new Set(), //for now it can only be [1] or [2]
   age: new Set(),
   customAgeRange: [], // when set and has exactly 2 values, overrides age Set!

   race: new Set(), //this has a set of race indexes
   sex: new Set(), //can have only one member: 1 or 2
   brSet:new Set(), //user provided list of bridx 
   brXtX: new Set()  //only used in Brain Matrix for brain set intersections 
                       // across Data Types (also restrict by region if reg is set) 
   //until cross-set intersection is implemented, brXtX only has 1 value in Brain Matrix mode 
   //which is the current xdtype column where regions were selected & applied   
}
//=======================

const dtaAgeRanges=dtaNames.ageRanges;

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
  //if (dtaNames.race.length <= 1) { //after data was just fetched in allData
  console.log('[loadData] loading data..');

  //plain arrays loaded here:
  ['sex', 'race'].forEach( (e) => {
      let dtn=dtaNames[e];
      dtn.length=0; dtn.push(e);
      Array.prototype.push.apply(dtn, allData[e]);
  });
  //reg JSON has counts per xdtype, dx JSON has SUBJECT counts per xdtype
  // here we load dtOriCounts.reg and dtBrOriCounts.dx
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
          for (let i=1;i<=numDataTypes;i++)
            oric.push([i]); //push only list head for each datatype list
      } else { //dx JSON has counts of subjects sampled per each exp datatype!
        idx2db=allDx2db;
        oric=dtBrOriCounts.dx;
        oric.length=0; 
        for (let i=1;i<=numDataTypes;i++)
          oric.push([i]); //push only list head per each exp datatype list
      }
      ld.forEach(  (it) => {
        if (dtn.length!==it[0]) console.log(`Error: index mismatch loading ${e} data`);
        dtn.push(it[1]);
        dtnf.push(it[2]);
        idx2db.push(it[3]);
        if (oric) for (let i=1;i<=numDataTypes;i++)
             oric[i-1].push(it[3+i]);
      })
  })
  //-- special case: loading datasets, their public/restricted status and their original counts
  const ds=dtaNames.dset;
  const dsp=dtaNames.dsetp; //public status info (1 or 2) for each dataset
  const dsoc=dtOriCounts.dset;
  ds.length=0;dsp.length=0; dsoc.length=0;
  let ld=allData.datasets;
  //sanity check:
  if (ld.length!==numDataTypes) 
      console.log("[loadData] Error: allData.dset len ", ld.length, " not ", numDataTypes)
  allDset2db.length=0;
  for (let i=0;i<numDataTypes;i++) {
     ds.push([i+1]); //push only list head for each datatype list
     dsp.push([i+1]); //push only list head for each datatype list
     dsoc.push([i+1]);
     allDset2db.push([i+1]);
     ld[i].forEach( (it)=>{ // idx, name, public status (0/1), dbid, sample_count
       ds[i].push(it[1]);   //   0    1        2                 3     4
       dsp[i].push(it[2]+1); // public_status+1
       dsoc[i].push(it[4]); //sample count
       allDset2db[i].push(it[3]); //save the dset.id from database
     })
  }
  //load brains
  dtaBrains.length=0;   // array of [ brint,  dx#, race#, sex#, age, dropped ]
  dtaBrains.push([]); //to make brain indexes start at 1 and match dtaBrains array idx
  dtaBrIdx.length=0;  //cleared, array which has just 1 hash mapping a brint to a dtaBrains index
  
  //-- prep single-dimensional count arrays
  //  for dtBrStats, dtBrOriCounts.X*
  ['dx', 'reg', 'race', 'sex', 'age'].forEach( (f)=>{
      let n=dtaNames[f].length;
      [ dtBrStats[f], dtBrOriCounts[`X${f}`] ].forEach( (dt) => {
          if (dt) {
            let z=n;
            dt.length=n; dt[0]=f;
            while (--z) dt[z]=0;
          }
        })
  });
  // also dtBrStats.dx 

  let stDx=dtBrStats.dx, stAge=dtBrStats.age,
     stRace=dtBrStats.race, stSex=dtBrStats.sex;
  //loading dtaBrains, dtaBrIdx[0] hash, dtBrStats except .reg
  const br2idx={};
  dtaBrIdx.push(br2idx);
  noXBrs.clear();
  allData.brains.forEach( (bd)=>{
    const [idx, brint, dxi, ri, si, age, drop]=bd;
    if (dtaBrains.length!==idx) {
       //console.log();
       throw new Error(`[loadData] Error: brain index ${idx} mismatch (${dtaBrains.length})`);
    }
    noXBrs.add(idx); //will remove later after seen in JSON sdata
    dtaBrains.push([brint, dxi, ri, si, age, drop]);
    br2idx[brint] = idx; 
    //update dtBrStats:
    let ax=age2RangeIdx(age);
    if (ax===0) ageWarn(age); else stAge[ax]++;
    stDx[dxi]++;
    if (!stDx[0]) {
      console.log("Error: invalidated sdDx[0] for brain entry: ", bd);
    }
    stSex[si]++;stRace[ri]++;
  });
  
  //now load allData.sdata
  for (let i=0;i<dtXall.length;i++) dtXall[i].length=0; 
  dtXall.length=0;
  smpBrTotals.length=0;
  br2Smp.length=0;
  smp2Br.length=0;
  dtXsel.length=0; //clear this array of arrays

  //reset count arrays here so we can update dt*OriCounts when loading samples
  // -- also dtOriCounts, dtBrOriCounts (except .dx) to be filled now
  // --- multi-dimensional counts (per exp type)
  //           dtOriCounts   :    dx, race, sex, age  (reg, dset already filled)
  //           dtBrOriCounts :   reg, race, sex, age  (dx already filled )
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
  });

  //single dimensional arrays to populate
  const ocproto=dtOriCounts.proto; //just for xtype 0 for now
  //never initialized before, do it here
  let n=dtaNames.proto.length;
  ocproto.length=n; ocproto[0]='proto'; while (--n) ocproto[n]=0;
  const brXdxoc=dtBrOriCounts.Xdx; //counts per dx of brains having ANY experimental data
  const brXregoc=dtBrOriCounts.Xreg; //same with dtBrStats.reg!
  const brXraceoc=dtBrOriCounts.Xrace;
  const brXageoc=dtBrOriCounts.Xage;
  const brXsexoc=dtBrOriCounts.Xsex;
  const XBrRegs = [] // keep brix.'_'.regix across ALL xt data
    // across all datatypes (so this counts only brains with experimental data!)
  XBrs.clear();
  allData.sdata.forEach( (xtdata, xtix) => {
    dtXsel.push([]); //clear selection
    dtXall.push( xtdata ); //collecting data for all sample types, as is
    const b2s={}; //using {} to make sure bridx is converted to string as key
    br2Smp.push(b2s);
    const s2b=[];
    smp2Br.push(s2b);
    // for region counts:
    const xtBrRegs=[] //distinct brix.'_'.regix for this xtype

    //-- these are sample counts spread by per experimental type
    const dxoc=dtOriCounts.dx[xtix];     
    const raceoc=dtOriCounts.race[xtix];
    const sexoc=dtOriCounts.sex[xtix];
    const ageoc=dtOriCounts.age[xtix];
    // dtOriCounts.reg were loaded earlier from xdata.reg

    //-- these are subject counts spread by per experimental type
    const bdxoc=dtBrOriCounts.dx[xtix]; 
    const braceoc=dtBrOriCounts.race[xtix];
    const bsexoc=dtBrOriCounts.sex[xtix];
    const bageoc=dtBrOriCounts.age[xtix];  
    const bregoc=dtBrOriCounts.reg[xtix];

    let brXTCounted={}; //hash to determine uniqueness of bridx per this exp.type
           // use to populate btBrOriCounts.(dx,sex,race,age) for the current datatype
    xtdata.forEach( (sd, si)=> { // [ bridx, sample_id, dsidx, regidx, proto ]
      const [bridx, sid, , rg, p]=sd;
      s2b[sid]=bridx; //should be a single brain, duh
      let smps=b2s[bridx];
      if (!smps) { smps=[]; b2s[bridx]=smps }
      smps.push(si);
      if (xtix===0) ocproto[p]++;
      // -- update dtOriCounts.dx sample counts:
      const [ , dxi, raidx, sidx, age ] = dtaBrains[bridx]; // [brint, dxidx, raceidx, sexidx, age, drop]
      let ax=age2RangeIdx(age);      
      dxoc[dxi]++;
      raceoc[raidx]++;
      sexoc[sidx]++;
      ageoc[ax]++;
      //if (!brCounted[bridx]) { //new across all exp types
      if (!XBrs.has(bridx)) {
        //brCounted[bridx]=1;
        XBrs.add(bridx);
        // also remove it from noXBrs !
        noXBrs.delete(bridx);
        brXdxoc[dxi]++; //counts per dx of brains having ANY experimental data
        brXageoc[ax]++;
        brXraceoc[raidx]++;
        brXsexoc[sidx]++;
      }      
      if (!brXTCounted[bridx]) { //counts for this exp type
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
    });    
    smpBrTotals.push([xtdata.length, Object.keys(b2s).length]);
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

export function getFilterData(fid, showZero) {
  //showZero only used for Brain Matrix (selXType=0) 
  // to show all available subjects (using dtBrStats for oriCounts)
  const selXType=rGlobs.selXType;
 /* This function returns data to be displayed in a FltMList control
    returns an array of items data, each row is an array: 
     [ itemLabel, itemBadgeValue, lockStatus, dtaNames[fid] index, itemOrigCounts, tooltip_fullname ]
  The list should have only items with itemOrigCounts > 0 
  Note that itemBadgeValue is taken from dtXCounts so self-filtering is avoided
*/
  //console.log(`getFilterData for ${fid} called`);
  if (!rGlobs.dataLoaded) return [];

  const rdata=[]; //returning data here a list of items data

  if (!selXType && (fid==='dset' || fid==='proto')) {
    console.log(`Error: getFilterData(${fid}) should NOT be called with 0 selXType`);
    return rdata;
  }

  let xt=selXType ? selXType-1 : 0;
  
  const fltNames = (fid==='dset') ? dtaNames.dset[xt] : dtaNames[fid];
  if (!fltNames || fltNames.length<2) {
      //   throw new Error(`Error: could not find data for filter name "${fid}"`);
     console.log(`[getFilterData] Error: no names data found for filter name "${fid}" (selXType=${selXType})`);
     return rdata;
  }
  const arrFid=( fid === 'reg' || fid === 'dx');

  const fullNames = (arrFid ? dtaNames[`${fid}Full`] : new Array(fltNames.length).fill('') );
  //console.log(`[getFilterData] called with fid=${fid} (selXType=${selXType})`);
  //these will be arrays of multi-data in case of reg and dx 
  let oriCounts=null, fltXCounts = null;

  if (selXType) {
    if (fid==='dset') { // RNAseq only  etc.
      oriCounts=dtOriCounts.dset[xt]; 
      fltXCounts=dtXCounts.dset;
    } else { //only proto is different
      oriCounts = ( fid==='proto' ? dtOriCounts.proto : dtOriCounts[fid][xt]);
      fltXCounts= ( arrFid ? dtXCounts[fid][xt] : dtXCounts[fid]);
    }  
  } else {  // Brain Matrix mode!
    oriCounts= showZero ? dtBrStats[fid]  : dtBrOriCounts[`X${fid}`];
    fltXCounts = (showZero ? dtBrXCounts[fid]: 
         (arrFid ? dtXCounts[`X${fid}`] : dtXCounts[fid]) );
  }
  const fltPubStatus = (fid==="dset" ? dtaNames["dsetp"][xt] : []);
  if (fltPubStatus.length===0) { //make a dummy array
      fltPubStatus.length=fltNames.length; //all undefined
  }

  if (fltNames.length!==fltXCounts.length || fltXCounts.length!==oriCounts.length)
      throw new Error(`[getFilterData ${fid}]: fltNames(${fltNames.length}), fltXCounts(${fltXCounts.length}) and oriCounts(${oriCounts.length}) must be equal length!`);
  //   [ itemLabel, itemBadgeValue, lockStatus, dtaNames[fid] index, itemOrigCounts, tooltip_fullname ]
  // only returns items with oriCounts non-zero
  fltNames.forEach( (n,i)=>{
    if (i && oriCounts[i]>0) {
      rdata.push([n, fltXCounts[i], fltPubStatus[i], i, oriCounts[i], fullNames[i]]);
    }
  })
  return rdata;
}

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
  if (xtx) { //in the future this could be an array of values
    // we could use Array.isArray(xtMain) here to check
    // for now it must be a 1-based xtype index
     dtFilters.brXtX.add(xtx-1) //note: 0-based xt is stored!
  }

  updateCounts();
}

//returns a boolean if ANY filters are set
export function anyActiveFilters() {    
    for (const key in dtFilters) {
        if (!Object.prototype.hasOwnProperty.call(dtFilters, key)) continue;
        if (key==='customAgeRange') {
           if (dtFilters[key].length===2) return true;
        } else //must be a set
            if (dtFilters[key].size) return true;
    }
    return false;
}

export function clearFilters() { //reset (empty) filters
  for (const key in dtFilters) {
    if (!Object.prototype.hasOwnProperty.call(dtFilters, key)) continue;
    if (key==='customAgeRange') {
       dtFilters[key].length=0;
      } else {//must be a set
          dtFilters[key].clear();
          console.log(`..clearing filter ${key}`)
      }
  }
  updateCounts();
  // remember to call notifyUpdate
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

export function changeXType( newXType=0, forceUpdate=false ) {
   
  rGlobs.selXType=newXType;
  // clear filters?
  if (forceUpdate || newXType!=rGlobs.prevSelXType) updateCounts();
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
  //console.log('[updateCounts] with selXType=',selXType, '  and selChanged=', selXTypeChanged);

  //reset multi-dimensional counts, set length and zero-fill: 
  ["dx", "reg"].forEach( (e)=>{
    let z=dtaNames[e].length;
    [ dtCounts[e], dtBrCounts[e], dtXCounts[e] ].forEach( (oc)=>{
      let n=numDataTypes;
      oc.length=n;
      while (n--) { 
         oc[n]=[n+1]; oc[n].length=z;
         let i=z;  while(i--) oc[n][i]=0;  
      }
    });
  });
  // proto counts are a special thing that only dtCounts and dtXCounts have
  // single dimensional counts: (but Xdx and Xreg will be prepped later)
  ["proto",  "age", "sex", "race"].forEach( (f)=>{
    let n=dtaNames[f].length;
    [ dtCounts[f], dtBrCounts[f], dtXCounts[f], dtBrXCounts[f] ].forEach( (dt) => {
        if (dt) { //some may be null/undefined
          let z=n;
          dt.length=n; dt[0]=f;
          while (--z) dt[z]=0;
        }
      })
  });
  
  let XtX=-1; // for now in Brain Matrix mode only one xtype is allowed in dtFilters.brXtX
  // this also determines if the region filter is checked!
  const selType0 = (selXType===0);
  const xtiList=[] // list of experiment data dype sets of samples to filter
  // if selXType, this just has selXType-1
  // if Brain Matrix mode this has all 3, with the brXtX one first
  dtXsel.length=0; 
  dtBrXsel.length=0;
  if (selXType) { //specific data type selected, not Brain Matrix
      XtX=selXType-1;
      xtiList.push(selXType-1); //only this sample list is going to be scanned
      //dset init & clear:
      let dt=dtCounts.dset, dtx=dtXCounts.dset,
          z=dtaNames.dset[selXType-1].length;
      dt.length=dtx.length=z;
      dt[0]=dtx[0]='dset';
      while(--z)  { dt[z]=0; dtx[z]=0; }
  } else {
    //in Brain Matrix mode, we're still scanning all the xt sample lists
    // in order to build the region (and dx) matrices per each xptype
    // prep uni-dimensional arrays Xreg, Xdx arrays and also dtBrXCounts.dx.
    ["reg", "dx" ].forEach( (f)=>{
      let n=dtaNames[f].length;
      const arr=[ dtBrCounts[`X${f}`], dtXCounts[`X${f}`] ];
      if (f==='dx') arr.push(dtBrXCounts.dx);
      arr.forEach( (dt) => {
          if (dt) { //some may be null/undefined ?
            let z=n;
            dt.length=n; dt[0]=f;
            while (--z) dt[z]=0;
          }
        })
      });
     const xc=dtFilters.brXtX.size;
     let xi=0;
     if (xc) { //assume xt type (0-based) is the first/only element
         if (xc>1) throw new Error('Error: multiple intersection data types not implemented!');         
         //get the first (and only for now) value
         XtX=dtFilters.brXtX.values().next().value; //get first item
         for (xi=0;xi<numDataTypes;xi++) if (xi===XtX) { xtiList.push(XtX); break }
         for (xi=0;xi<numDataTypes;xi++) if (xi!==XtX) xtiList.push(xi);
     } else { // no brXtX filter specified at all (which at this time means no region filter!)
       for (xi=0;xi<numDataTypes;xi++)  xtiList.push(xi); //just the default order
     }
    }

  // Scan sample lists (all data types when selXType is 0 !!!)
  dtBrAllsel.clear(); //clear the set of bridx selected across all experiment types

  let dtBrXCountsReg=dtXCounts.Xreg; //brain_region counts across all exp types
  let dtBrXCountsDx=dtXCounts.Xdx;
  let dtBrXallCountsDx=dtBrXCounts.dx; //follows dtBrXCounts.Xdx for selType0
  let dtBrXallCountsRace=dtBrXCounts.race; //follows dtXCounts.race for selType0
  let dtBrXallCountsSex=dtBrXCounts.sex; //follows dtXCounts.sex for selType0
  let dtBrXallCountsAge=dtBrXCounts.age; //follows dtXCounts.age for selType0
  
  const brSet=dtFilters.brSet; //brnum list filter requested
  const haveBrSet = (brSet.size>0); 
  // for Brain Matrix,  region counts across experiments
  const XBrRegs = [] // keep brix.'_'.regix across ALL xt data

  // -------------- checking samples for each exp data type in xtiList (just 1 if selXType)
  //console.log('xtList : ', xtiList)
  for (let xjj=0; xjj<xtiList.length; xjj++) {
    const xt=xtiList[xjj];
    const sdta=dtXall[xt]; 
    if (!sdta || sdta.length==0) {
      console.log(`[updateCounts] Error: no sample data found for data ${dtaDTypes[xt]}`);
      continue;
    }
    // for region counts:
    const xtBrRegs=[] //distinct brix.'_'.regix for this xtype
    let dtCountsReg=dtCounts.reg[xt];
    let dtCountsDx=dtCounts.dx[xt];
    let dtXCountsReg=dtXCounts.reg[xt];
    //console.log(`DLPFC dtXCounts.reg[${xt}] before update: ${dtXCountsReg[1]}`)
    let dtXCountsDx=dtXCounts.dx[xt];
    let dtBrCountsReg=dtBrCounts.reg[xt];
    let dtBrCountsDx=dtBrCounts.dx[xt];
    

    if (selType0 && xjj) {
      //need to reset uni-dimensional dtCounts before each data type - not really needed actually, 
      // as they are not used in matrix mode - dtBrCounts should be used instead to accumulate br counts
      ["age", "sex", "race"].forEach( (f)=>{
        let n=dtaNames[f].length;
        [ dtCounts[f] ].forEach( (dt) => {// dtBrCounts[f], dtXCounts[f], dtBrXCounts[f] ].forEach( (dt) => {
            if (dt) { //some may be null/undefined
              let z=n;
              dt.length=n; dt[0]=f;
              while (--z) dt[z]=0;
            }
          })
      });
    }
    //when selXType===0, we are in Brain Matrix mode, so all rows in these multi-dtype arrays are updated:
    //    brCounted, dtCounts.[reg|dx], dtXCounts.[reg|dx], dtBrCounts.[reg|dx]
    //    ALSO - no region filters are checked EXCEPT for the dtFilters.brXtX data type (xt===brXtX)
    // -- when selXType>0, we could just have the [xt] of all the above updated
    
    // in that case, dtXCounts will hold SUBJECT counts instead of sample counts
    //  and region x datatype value in the matrix shows the count of distinct human subjects 
    // having samples from that region and that datatype
    // only if first seen, the subject will be counted in dtXCounts.reg (if selXType==0) and dtBrCounts.reg
    const brCounted={} // only used for unique phenotype features (i.e. no region counts) for this xt
        // if first seen, a subject will counted in dtXCounts (if selXType==0) and dtBrCounts
    dtXsel[xt]=[]; //clear selected data to refill
    dtBrXsel[xt]=new Set();
    const len=sdta.length;
    
    for (let i=0;i<len;++i) { //for each sample data row
        //const [sid, p, d, dx, r, s, a, rg, br] = dtXall[i];
        const [ brix, sid, ds, rg, p ] = sdta[i]; 

        if (haveBrSet && !brSet.has(brix))  //!!! absolute skip of samples from this brain, not on the list!
                  continue;
        //* another fast rejection is in Brain Matrix mode if XtX >= 0 (intersection mode)
        //     if xt!=XtX, it means btBrAllsel is already LOCKED IN by the first xt pass before this
        // i.e. no new brains are allowed to pass the filters, hence no new samples from those brains are counted
        if (selType0 && XtX>=0 && XtX!=xt && !dtBrAllsel.has(brix))
               continue;
        const [ , dx, r, s, a ] = dtaBrains[brix];
        let ax=0;
        let newBr=!brCounted[brix]; // for current xt        
        let newXBr = !dtBrAllsel.has(brix); // across ALL data types!
        //for region counts:
        const brreg=`${brix}_${rg}`
        const newBrReg=!xtBrRegs[brreg];
        const newXBrReg=!XBrRegs[brreg];

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
       
        const cntIt=(selXType || newBr);
        const cntItX=(selXType || newXBr);
        const cntReg=(selXType || newBrReg);
        //const cntRegX=(selXType || newXBrReg);
        if (filterBits) { // FAILED the filters
          //still count in case of failing ONLY due to self-filters!
          if (ax===0) ax=age2RangeIdx(a);
          switch (filterBits) {
              case fltbit_Reg: if (cntReg) {
                                   dtXCountsReg[rg]++; 
                                   xtBrRegs[brreg]=1;
                               }
                              if (newXBrReg) {
                                  dtBrXCountsReg[rg]++;
                                  XBrRegs[brreg]=1;
                              }
                              break;
              case fltbit_Dx: if (cntIt) { dtXCountsDx[dx]++; }
                              if (newXBr) {
                                  dtBrXCountsDx[dx]++; 
                                  dtBrXallCountsDx[dx]++; 
                                }
                              break;
              case fltbit_Dset:  if (selXType) dtXCounts.dset[ds]++; break;
              case fltbit_Proto: if (selXType) dtXCounts.proto[p]++; break;
              case fltbit_Age:  if (cntItX && ax) { 
                                       dtXCounts.age[ax]++; 
                                       //if (newXBr) dtBrAllsel.add(brix);
                                       dtBrXallCountsAge[ax]++; 
                                      } 
                                break;
              case fltbit_Race: if (cntItX) { 
                                    dtXCounts.race[r]++;  
                                    //if (newXBr) dtBrAllsel.add(brix);
                                    dtBrXallCountsRace[r]++; 
                                  }
                                break;
              case fltbit_Sex:  if (cntItX) { 
                                      dtXCounts.sex[s]++; 
                                      //if (newXBr) dtBrAllsel.add(brix);
                                      dtBrXallCountsSex[s]++;
                                    }
                                break;
          }
          //if (filterBits===fltbit_Dspub) dtXCounts.dspub[dsetIdx[d]]++;
          continue;  //do not really "count" / store
        }
        
        // ---   passed the filters:
        dtCountsReg[rg]++;
        if (cntReg) dtXCountsReg[rg]++; 
        if (newBrReg) xtBrRegs[brreg]=1;
        if (newXBrReg) {
          dtBrXCountsReg[rg]++;
          XBrRegs[brreg]=1;
        }
        dtCountsDx[dx]++;

        if (ax===0) ax=age2RangeIdx(a); 
        if (ax===0) ageWarn(a);
           else dtCounts.age[ax]++;
        dtCounts.race[r]++;
        if (cntIt) {
          dtXCountsDx[dx]++;
        }
        if (cntItX) {
          if (ax) { dtXCounts.age[ax]++;  dtBrXallCountsAge[ax]++; }
          dtXCounts.race[r]++; dtBrXallCountsRace[r]++;
          dtXCounts.sex[s]++;  dtBrXallCountsSex[s]++;
        }
        if (newXBr) { dtBrXCountsDx[dx]++; dtBrXallCountsDx[dx]++; }

        dtCounts.sex[s]++;
        if (selXType) {
           dtCounts.dset[ds]++;
           dtXCounts.dset[ds]++;
           dtCounts.proto[p]++;
           dtXCounts.proto[p]++;
        }
        //dtCounts.dspub[dsetIdx[d]]++;
        //dtXCounts.dspub[dsetIdx[d]]++;
        if (newBrReg) dtBrCountsReg[rg]++;
        if (newBr) {
          brCounted[brix]=1;          
          dtBrCountsDx[dx]++;
        }
        if (newXBrReg) dtBrCounts.Xreg[rg]++;
        if (newXBr) {
          if (ax) dtBrCounts.age[ax]++;
          dtBrCounts.Xdx[dx]++;
          dtBrCounts.sex[s]++;
          dtBrCounts.race[r]++;
        }
        dtBrAllsel.add(brix); // across ALL data types!

        // all samples passing the filters:
        dtXsel[xt].push([ brix, sid, ds, rg, p ]);
    }
    //console.log(`dtCounts.race is: ${dtCounts.race}`);
    //show counts for HIPPO reg (regix=2):    
    /*
    console.log(`xt ${xt} DLPFC dt(Smp)Counts[xt]/dtXCounts[xt]/dtBrCounts[xt]/dtBrXCountsXreg : `,
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


   } // for each datatype
    
   //return [selXType, dtXs, dtCounts ]   
   //now update dtBrXCounts with all the noXBrs that pass the filters (add them to all arrays)
   if (selType0 && XtX<0)
     noXBrs.forEach( (brix)=>{
       const [ , dx, r, s, a, ] = dtaBrains[brix];
       if (haveBrSet && !brSet.has(brix))  //!!! absolute skip, not on the list
                      return; //exit this arrow function iteration (i.e. like continue)
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
              case fltbit_Dx: dtBrXallCountsDx[dx]++; break;
              case fltbit_Age: if(ax) dtBrXallCountsAge[ax]++; break;
              case fltbit_Race: dtBrXallCountsRace[r]++; break;
              case fltbit_Sex: dtBrXallCountsSex[s]++; break;
          }         
       } else { //passed the filters!
         dtBrXallCountsDx[dx]++;
         if (ax===0) ax=age2RangeIdx(a);
         if (ax===0) ageWarn(a);
         if (ax) dtBrXallCountsAge[ax]++;
         dtBrXallCountsRace[r]++;
         dtBrXallCountsSex[s]++;
       }

     })
  //console.log(dtXCounts.proto);
}



export function getBrSelData(showSmpCounts) {
//returns an array with rows of data for brains in dtBrAllsel
// if showSmpCounts is an array, it has experiment data types 
//      to report sample counts for (0 based), e.g. [0, 1]
  const rows=[]
  let extraCols=0;
  const hdr=['BrNum', 'Dx', 'Race', 'Sex', 'Age'];
  if (Array.isArray(showSmpCounts)) {
    extraCols=showSmpCounts.length
    for (let i=0;i<extraCols;i++)
      hdr.push('snum_'+dtaDTypes[showSmpCounts[i]])
  }
  // array of [brnum, dx, race, sex, age, numsmpxt1, ... ]
  rows.push(hdr)
  dtBrAllsel.forEach( brix => {
     const [brint, dxix, raix, six, age, dropped]=dtaBrains[brix]
     const row=[`Br${brint}`, dtaNames.dx[dxix], 
        dtaNames.race[raix], dtaNames.sex[six], age]

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

export function useRData() {  return useContext(RDataCtx) }
export function useRDataUpdate() {  return useContext(RDataUpdateCtx) }

export function RDataProvider( {children} ) {
  //rcData is [ dtXs, dtCounts, dtBrCounts ]
  const [rcData, setRData] = useState([ dtXsel, dtCounts, dtBrCounts, rGlobs.dataLoaded ]);
  // const [query, setQuery] = useState('all_rnaseq.meta.json.gz');
  //-------------- client-side fetch is built in the browser
  // the /assets/ bundled url is for development only
  // normally data should be fetched using axios => useSWR() from the node server
  //TODO: fetch this from the NODE server instead of the bundled data
 
  //const [datasrc, setDataSrc] = useState('/assets/rnaseq_samples.json.gz');
  const [datasrc, setDataSrc] = useState('/assets/multi_dta.json.gz');

  function updateRData(durl, dta) { 
      console('>>>> [RDataProvider.updateRData] called!')
      setDataSrc(durl);
      setRData(dta);
  }
  
  const fetchZjson = async (url) => {
    const jres =  await fetch(url, { mode: 'cors'})
    const ctype=jres.headers.get('Content-Type')
    //console.log(" content type : ", ctype)
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
      console.log(`FltCtxProvider: requested update of [${fltUpdInfo}] by "${fId}"`);
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
