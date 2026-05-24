import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState, useReducer, useRef} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label, CustomInput} from 'reactstrap';
import axios from 'axios'
import {rGlobs, changeXType, RDataProvider, dtaNames, dtFilters,
	dtaBrains, dtBrXsel, updateBrCountsFromBrSet, dtBrCounts, dtaBrIdx, br2Smp,
	useRData, clearFilters, anyActiveFilters} from '../../comp/RDataCtx';
import { navRoutes } from '../../comp/header';
import RSelSummary from '../../comp/RSelSummary'
import { clearTooltips, setupTooltips } from '../../comp/ui';
//dtBrXsel has the brains that passed the filters

/* import useSWR from 'swr'

const fetcher = url => axios.get(url).then(res => res.data)
const opts = { revalidateOnFocus:false }
*/
function arrShow(c) {
	return Array.isArray(c) ? c.map( (e, i) => (i ? <span><br />{e}</span> : <>{e}</>  ))
		   : c
}


const xtcols=['RNAseq', 'DNAm/450k', 'DNAm/WGBS', 'WGS'] // adjust this in the future as other exp data types are added
const xtcolors=['#c9e9d1', '#bfdeff', '#f6cdd1' , '#fff0c1',  '#dbd0f0']
//                 green,    blue,     red    ,   yellow,       purple
const xtgrey='#cdcdcd'
//const numsortCols=[   1,                                5,    6,       7,       8,       9,]
const basecols=['#','BrNum', 'Dx', 'Ancestry', 'Sex', 'Age', 'PMI', 'MoD' ] //region columns to be added
const guidBasecols=['#','BrNum', 'GUID', 'Dx', 'Ancestry', 'Sex', 'Age', 'PMI', 'MoD' ] //region columns to be added
const stickyWs=[ 54, 64, 78 ]; //pixels

function hasGuid(guid) {
	return String(guid || '').trim().length>0
}

function getBaseCols(showGuids) {
	return showGuids ? guidBasecols : basecols
}

function getStickyCols(showGuids) {
	return showGuids ? [0, 1, 3] : [0, 1, 2] //stick #, BrNum, Dx
}

function getDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, showGuids) {
	const cells=[`${r+1}.`, `Br${brint}`]
	if (showGuids) cells.push(`${guid}`)
	cells.push(`${dtaNames.dx[dxix]}`, `${dtaNames.race[raix]}`,
						`${dtaNames.sex[six]}`, age, pmi, `${dtaNames.mod[mi]}`)
	return cells
}

function getExportDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, showGuids) {
	const cells=[`${r+1}`, `Br${brint}`]
	if (showGuids) cells.push(`${guid}`)
	cells.push(`${dtaNames.dx[dxix]}`, `${dtaNames.race[raix]}`,
						`${dtaNames.sex[six]}`, age, pmi, `${dtaNames.mod[mi]}`)
	return cells
}

function eqSets(s1, s2) {
	if (s1.size!==s2.size) return false
  for (let e of s1) if (!s2.has(e)) return false;
	return true;
}

function setSignature(s) {
	const sig=[s.size]
	s.forEach(e => sig.push(e))
	return sig.join(',')
}

function getVisibleXTypes(showXTs) {
	const visible=[]
	xtcols.forEach( (e, i)=> {
		if (!showXTs || !showXTs.length || showXTs[i]) {
			visible.push({ ix:i, color:xtcolors[i] })
		}
	})
	return visible
}

// update brSet to have only the entries in dtBrXsel with
// having samples in all the exp. types in reqXtSet
// returns [ countCols, tableRows, fromCached ]
function prepTable(byRegion, mcache) {
	const brSig=setSignature(dtBrXsel)
  if (mcache && mcache.brSig==brSig && mcache.byRegion==byRegion)
      return [ ... mcache.r_data, true ] // [ rcols, rds ] did not change since last render
	const brseldata=[]
	const rds=[]
	let rcols=null

	//every render - prepare brseldata
	if (byRegion) {
		//TODO : build rds rows
		rcols=dtaNames.reg.slice(1) //just region names
		dtBrXsel.forEach( brix=> {
		  const [brint, guid, dxix, raix, six, age, pmi, mi, ...rest]=dtaBrains[brix] //  [ brint,  guid, dx-idx, race-idx, sex-idx, age, pmi, has_seq, has_geno, dropped ]
			// array of [ xt0-smpcount, xt1smpcount, ... ] for each region
			const rxtcounts=rcols.map( () =>new Array(xtcols.length).fill(0) ) // zero init
			xtcols.forEach( (v,xt)=> {
				let sd = br2Smp[xt]; // array of [sample_id, reg-ix]
				if (sd && sd[brix]) { //get counts count per region for this brain
           sd[brix].forEach( smprg=> {
						   rxtcounts[smprg[1]-1][xt]++ //increment sample count for this region
					 } )
				}
			})
       rds.push([brix, brint, guid, dxix, raix, six, age, pmi, mi, ...rxtcounts])
		})
    if (mcache) { //memoize this
       mcache.brnum=dtBrXsel.size;
       mcache.brSig=brSig;
       mcache.byRegion=byRegion;
       mcache.r_data=[rcols, rds]
    }
		return [rcols, rds, false]
	}
  // simplified table, only total sample counts per experiment data type
  // rds should be array of [brint, guid, dxix, raix, six, age, pmi, counts...]
	dtBrXsel.forEach( brix=> {
		const [brint, guid, dxix, raix, six, age, pmi, mi, ...rest]=dtaBrains[brix] //  [ brint,  guid, dx-idx, race-idx, sex-idx, age, pmi, has_seq, has_geno, dropped ]
		const counts=[]
		xtcols.forEach( (v,xt)=> {
			let sd = br2Smp[xt];
			let snum = 0
			if (sd && sd[brix]) snum=sd[brix].length;
			counts.push(snum)
		})
		rds.push([brix, brint, guid, dxix, raix, six, age, pmi, mi, ...counts])
   })

   if (mcache) { //memoize this
    mcache.brnum=dtBrXsel.size;
    mcache.brSig=brSig;
    mcache.byRegion=byRegion;
    mcache.r_data=[xtcols, rds]
  }
  return [xtcols, rds]
}

//filter the brains table based on a set of brix
function tableFilter(tblrows, brset) {
	const rows=[]
  tblrows.forEach( r => {
		if (brset.has(r[0])) rows.push(r)
	})
	return rows
}

function getBrTblRow(rd, brix, i) {
	const [brint, guid, dxix, raix, six, age, pmi, mi, hasSeq, hasGeno, dropped]=rd;
	let rs = br2Smp[0];
	let numrs = 0
	if (rs && rs[brix]) {
	  numrs=rs[brix].length;
	}
	let ds = br2Smp[1];
	let numds = 0
	if (ds && ds[brix]) {
	  numds=ds[brix].length;
	}
	let ws = br2Smp[2];
	let numws = 0
	if (ws && ws[brix]) {
	  numws=ws[brix].length;
	}
	return(<tr key={i}>
		<td>{i}.</td>	<td>Br{brint}</td><td>{guid}</td><td>{dtaNames.dx[dxix]}</td>
		<td>{dtaNames.race[raix]}</td> <td>{dtaNames.sex[six]}</td>	<td>{age}</td>
		<td>{pmi}</td> <td>{dtaNames.mod[mi]}</td>
		<td>{numrs}</td>	<td>{numds}</td>		<td>{numws}</td>
		{/* <td>{dropped ? 'dropped' : ''}</td> */}
	</tr>)
  }

const BrTable = ( props ) => {
	//const urls=[null, '/pgdb/brtable', '/pgdb/brseq'];
	const refData = useRef({
    brd: [],
		sortcol: 0,
		sortup: false, //sorting direction
		filteredRows: [],
		filteredTblRows: null,
		filteredBrSet: null,
		filteredBrSetVersion: -1,
  })
	const m=refData.current

	const baseColCount=getBaseCols(props.showGuids).length
	const stickyCols=getStickyCols(props.showGuids)
	const visibleXTypes=getVisibleXTypes(props.showXType)
	const stickyOrder = Array.isArray(stickyCols)
		? stickyCols.filter((c, idx) => stickyCols.indexOf(c) === idx)
		: Array.from({ length: stickyCols }, (_, i) => i)
	const stickySet = new Set(stickyOrder)
	const stickyWByCol = {}
	stickyOrder.forEach((col, i) => {
		stickyWByCol[col] = stickyWs[i]
	})
	const stickyLeftByCol = {}
	let stickyAcc = 0
	stickyOrder.forEach((col) => {
		stickyLeftByCol[col] = stickyAcc
		stickyAcc += stickyWByCol[col] || 0
	})
	const lastStickyCol = stickyOrder.length ? stickyOrder[stickyOrder.length - 1] : -1

	function renderRow(r, rd, byRegion) { //
		if (byRegion) { // rd is rds.push([brint, dxix, raix, six, age, pmi, mod, ...rxtcounts]
			// rxtcounts are per-region arrays of counts (one for each xtype in every array)
			const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...rxtcounts]=rd
			const outrd=getDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, props.showGuids)
			return(<tr key={`tr${r}`}>{
			outrd.map(  (e,i)=> {
					let cl=null, st=null;
					if (stickySet.has(i)) {
						cl="app-sticky";
						let w=(stickyWByCol[i] || 0)
						if (i===lastStickyCol && w>0) w-=1
						st=`min-width:${w}px;max-width:${w}px;left:${stickyLeftByCol[i]}px;`
					}
					return ((i===lastStickyCol) ?  <td key={`r${r}td${i}`} class={cl} style={st}><span>{e}</span></td>
							: <td key={`r${r}td${i}`} class={cl} style={st}> {e} </td>)
				})}
				{ //now output the region counts, by xtype in each region
					rxtcounts.map( (rc,i)=>{
				      return(<td key={`r${r}tc${i}`}> {
							  visibleXTypes.map( ({ix, color}) => {
								   const c=rc[ix]
								   return (<span key={`r${r}c${i}x${ix}`} class={ c ? "rxtc" : "rxtc0"}
									         style={ c ? {backgroundColor: color } : null } >{c}</span>) } )
					        }	 </td>) })
			 }
		</tr>)
	 }
		// --simplified rd: [brint, dxix, raix, six, age, pmi, counts...]
	 const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...counts] =rd;
	 const outrd=getDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, props.showGuids)
		 return(<tr key={`tr${r}`}>{
				outrd.map(  (e, i)=> {
				 let cl=null, st=null;
				 if (stickySet.has(i)) {
						cl="app-sticky";
						let w=(stickyWByCol[i] || 0);
						if (i===lastStickyCol && w>0) w-=1;
						st=`min-width:${w}px;max-width:${w}px;left:${stickyLeftByCol[i]}px;`
				 }
				 return ((i===lastStickyCol) ?  <td key={`r${r}td${i}`} class={cl} style={st}><span>{e}</span></td>
							 : <td key={`r${r}td${i}`} class={cl} style={st}> {e} </td> )
				 //return (<td key={i}> {e} </td>)
			 })}
			 { //now output the total sample counts by exp. type
				 visibleXTypes.map( ({ix, color})=>{
					 const c=counts[ix]
					 let spcl=null
					 spcl= c>0 ? "xtc" : "xtc0";
				 return (<td key={`r${r}td${ix+baseColCount}`}>
						 <span class={spcl} style={ c>0 ? {backgroundColor: color } : null }>{c}</span>
						 </td>)
				 })
			 }
		 </tr>)
	 }
	 function renderHeader(tblhdr) {
		 return ( tblhdr.map(  (e,i)=> {
				 let cl="app-sticky-top", st=null;
				 if (stickySet.has(i)) {
						cl="app-sticky-top-l";
						let w=(stickyWByCol[i] || 0);
						if (i===lastStickyCol && w>0) w-=1;
						st=`min-width:${w}px;max-width:${w}px;left:${stickyLeftByCol[i]}px;`
				 }
				 return ((i===lastStickyCol) ? <td key={`h${i}`} class={cl} style={st}> <span>{e}</span></td>
						: <td key={`h${i}`} class={cl} style={st}> {e} </td>)
		 } ) )
	 }

  function sortByCol(e) {
		  let t=$(e.target)
	}

	const cntcols = []
	if (props.byRegion) {
		props.tblCols.forEach( e=>{
			cntcols.push(e)
		})
	} else {
		visibleXTypes.forEach( ({ix})=> {
			cntcols.push(props.tblCols[ix])
		})
	}

	let tblrows=m.filteredRows
	if (m.filteredTblRows!==props.tblRows || m.filteredBrSet!==props.brSet ||
			m.filteredBrSetVersion!==props.brSetVersion) {
		tblrows=tableFilter( props.tblRows, props.brSet ) //filter rows to render
		m.filteredRows=tblrows
		m.filteredTblRows=props.tblRows
		m.filteredBrSet=props.brSet
		m.filteredBrSetVersion=props.brSetVersion
	}
  const tblhdr=[...getBaseCols(props.showGuids), ...cntcols]
	//<Col className="d-flex flex-row-reverse align-items-start justify-content-start m-0 p-0 overflow-auto"
	let wstyle=null
	const byRegion=props.byRegion
	if (byRegion && props.calcMaxWidth) {
		const maxw=props.calcMaxWidth();
		 //console.log("   setting max-width to: ", maxw)
		 if (maxw>0)
		   wstyle=`max-width:${maxw}px;`
	}
  const tbclass=byRegion ? "brtbl bregxt flex-shrink-1" : "brtbl flex-shrink-1"

	// console.log(" >>>> ~~~~ rendering BrTable with tblrows:", tblrows);
	return (<Col id="br-tbl-rx-col" className="d-flex flex-row-reverse flex-shrink-1 align-items-start justify-content-start m-0 p-0 overflow-auto"
	           style={wstyle}>
	 <table class={tbclass}><thead>
		<tr key="t0">
      { renderHeader(tblhdr) }
		</tr>
		</thead><tbody>
		  { tblrows.map( (rd, i)=> renderRow(i, rd, byRegion))  }
    </tbody></table>
		</Col>);
}
// ------------------- page content starts here
const BrBrowse = ( ) => {
     const refData=useRef( {
         tblkey:1,
				 showXType: new Array(xtcols.length).fill(true),
				 reqXType: new Set(),
				 brSet:null,
				 brSetSig:'',
				 brSetVersion:0,
				 tblCols:[], //as built by prepTable()
				 tblRows:[], //as built by prepTable()
				 // --- cache
         cache: { brnum:0, byRegion:false, r_data: [null, null], fltXT: new Set(), fltByRegion:false },
			   relWidth:0
		 })
     //const [winWidth, setwinWidth]=useState(0)
		 const m=refData.current;
     const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
		 const [byRegion, setByRegion]=useState(false)
		 const [showGuids, setShowGuids]=useState(false)
		 const [, forceUpdate] = useReducer((x) => x + 1, 0);
		 //const [brSet, setBrSet] = useState(null)

		 function toggleByRegion() {
			  if (!byRegion) {
           m.relWidth=$('#relSumBox').width()
					 //console.log(" relwdith: ", m.relwidth)
				}
       //m.tblkey++;
			 const newV=!byRegion;
			 [m.tblCols, m.tblRows]=prepTable(newV, m.cache)
			 setByRegion( newV )
		 }

    function calcMaxXRwidth() {
			return (window.innerWidth - m.relWidth-74);
		}

    function onBtnClick(e) {
       const id=e.target.id;
		   switch (id) {
			   case "b1": setTable(1);
			           break;
		  	 default:
		 }
	 }

	 function prepBrSet() {
     let cached=false;
		 [m.tblCols, m.tblRows, cached]=prepTable(byRegion, m.cache);
     if (m.brSet && cached && m.cache.fltByRegion==byRegion && eqSets(m.reqXType, m.cache.fltXT)) {
       return
     }
     const brSet=new Set()
     if (m.reqXType.size==0) { // no restrictions
  			dtBrXsel.forEach( brix=> {
  				brSet.add(brix)
  			})
        m.cache.fltXT=new Set(m.reqXType)
        m.cache.fltByRegion=byRegion
        const newBrSetSig=setSignature(brSet)
        if (!m.brSet || m.brSetSig!==newBrSetSig) {
          m.brSet=brSet
          m.brSetSig=newBrSetSig
          m.brSetVersion++
          updateBrCountsFromBrSet(m.brSet)
        }
        return
		 }
     //m.brSet rebuild from m.tblRows according to m.reqXType
     m.cache.fltXT=new Set(m.reqXType)
     m.cache.fltByRegion=byRegion
     if (byRegion) { //let pass only brains that have at least 1 region with all m.reqXType sequenced
       m.tblRows.forEach( (rd,i)=>{
          const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...rxtcounts] =rd;
          for(let ri=0;ri<rxtcounts.length;ri++) {
            let reqmet=true
            m.reqXType.forEach( v=> { reqmet &= (rxtcounts[ri][v]>0) })
            if (reqmet) { brSet.add(brix); break }
          }
       })
     } else { // let pass only brains that have samples of all m.reqXType types
         m.tblRows.forEach( (rd,i)=>{
            const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...counts] =rd;
            let reqmet=true
            m.reqXType.forEach( v=> { reqmet &= (counts[v]>0) })
            if (reqmet) brSet.add(brix)
         })
     }
     const newBrSetSig=setSignature(brSet)
     if (!m.brSet || m.brSetSig!==newBrSetSig) {
       m.brSet=brSet
       m.brSetSig=newBrSetSig
       m.brSetVersion++
       updateBrCountsFromBrSet(m.brSet) // rebuild brCounts.*2* ; brSet should be passed to RSelSummary
     }
	 }

	 function toggleXType(xt) {
		 //console.log("clicked xt=", xt, "showXType is:", m.showXType)
		 m.showXType[xt] = !m.showXType[xt]
		 //must trigger re-render to rebuild BrTable
		 //m.tblkey++;
		 forceUpdate();
	 }

	 function toggleReqXType(xt) {
		//console.log("clicked xt=", xt, " m.reqXType is:", m.reqXType)
		 if (m.reqXType.has(xt))
		    m.reqXType.delete(xt)
		 else m.reqXType.add(xt)
     forceUpdate();
	 }

	 function countGuidBrains(brSet) {
		 let count=0
		 if (!brSet) return count
		 brSet.forEach( brix=> {
			 const rd=dtaBrains[brix]
			 if (rd && hasGuid(rd[1])) count++
		 })
		 return count
	 }

   function getBrowseTable() { //for the SaveCSV dialog, get table data according to the current selections options
          //this should act similarly with the render functions as used in BrTable
          // same setup as in BrTable render:
          const cntcols = []
          const showXTs=m.showXType
          if (byRegion) {
            m.tblCols.forEach( r =>{
              const r_xt=[]
              //push <region>_<xn> for each showXType
              xtcols.forEach( (xn, xt)=> {
                if (m.showXType[xt]) r_xt.push(`${r}_${xn}`)
              })
              cntcols.push(...r_xt)
            })
          } else {
            m.tblCols.forEach( (e,i)=> {
              if (m.showXType[i]) cntcols.push(e)
            })
          }

          const tblrows = tableFilter( m.tblRows, m.brSet ) //filter rows to export according to current brSet
          //const tblhdr=[...basecols, ...cntcols]
          const rdata=[ [...getBaseCols(showGuids), ...cntcols] ] // add header row
          if (byRegion) {
            tblrows.forEach( (rd, r)=>{
              const shcounts=[]
              const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...rxtcounts]=rd
              const outrd=getExportDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, showGuids)
              rxtcounts.forEach( (rc,i)=>{
                 rc.forEach( (c,j)=> {
                   if (showXTs[j]) outrd.push(c) //do not export unless shown
                 })
              })
              rdata.push(outrd)
            } )
            return rdata;
          }
          // simplified table:
          tblrows.forEach( (rd, r)=>{
            const [brix, brint, guid, dxix, raix, six, age, pmi, mi, ...counts] =rd;
            const outrd=getExportDemoCells(r, brint, guid, dxix, raix, six, age, pmi, mi, showGuids)
            counts.forEach( (c,i)=> {
                if (showXTs[i]) outrd.push(c);
            })
            rdata.push(outrd)
          } )
          return rdata;
   }


   useEffect(() => {
    $('.toast').toast({ delay: 7000 })
    setupTooltips()
    return ()=>{ //clean-up code
       clearTooltips()
    }
	 }, []);

  useEffect(()=> {
    function debounce(fn, ms) {
      let timer
      return () => {
        clearTimeout(timer)
        timer = setTimeout( () => {
          timer = null
          fn.apply(this, arguments)
        }, ms)
      };
    }
    const debouncedHandleResize= debounce( ()=> {
       if (byRegion) {
           m.relWidth=$('#relSumBox').width()
					 const maxw=calcMaxXRwidth()
					 //console.log(" ..... setting max width of xtreg col to", maxw)
					 $('#br-tbl-rx-col').css({'max-width': `${maxw}px`})
					 //const maxw=window.innerWidth - m.relwidth-78;
           //setwinWidth(window.innerWidth) //force update
       }
     }, 300 )
     window.addEventListener('resize', debouncedHandleResize)
     return ()=>{ //clean-up code
         window.removeEventListener('resize', debouncedHandleResize)
     }

  })


   if (!anyActiveFilters(true)) {
		 return (<div class="col-12 d-flex flex-column">
			 <Row className="pt-3 d-flex flex-nowrap flex-row align-items-center justify-content-center">
			   <Col><div style="color:#d23;line-height:200%;font-size:100%;">
          <span>Please make a selection in the <b>Select</b> tab</span>
         </div>
				 </Col>
		 </Row></div>)
	 }

	prepBrSet() //this might rebuild m.brSet
	const guidCount=countGuidBrains(m.brSet)
  //console.log(" ~~~~~~~~~ rendering BrBrowse() m.reqXType =", m.reqXType, " .. and m.brSet: ", m.brSet);
  return (<div class="col-12 d-flex flex-column">
	   {/*<Row className="pt-1">
			 &nbsp;
		   <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Brain table</Button>
		 </Row>*/}
		 <Row id="brTblContainer" className="d-flex flex-grow-1 pt-0 mt-0 mr-0 pr-0 justify-content-center flex-nowrap">
		  {/* <Col className="d-flex mr-0 pr-0 flex-grow-1 align-self-stretch" > */}
			  <Col className="d-flex flex-column align-items-stretch justify-content-end mb-1">
					<Row className="d-flex flex-row justify-content-between align-items-start m-1 pt-1">
					<div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
						 <CustomInput type="checkbox" id="ckShowGuids" onClick={() => setShowGuids(!showGuids)} checked={showGuids} />
								 Show GUIDs ({guidCount})
					</div>
					<div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
      					 <CustomInput type="checkbox" id="ckByRegion" onClick={toggleByRegion} checked={byRegion} />
								 Show sample counts by brain region
  		  		  </div>

					</Row>
					{/* <Row className="m-1 pt-1 h-100"> */}
						<BrTable key={`${m.tblkey}-${byRegion ? 'region' : 'total'}`}
						       tnum={tbl} byRegion={byRegion} tblCols={m.tblCols} tblRows={m.tblRows} brSet={m.brSet}
						       brSetVersion={m.brSetVersion} showXType={m.showXType} showGuids={showGuids} calcMaxWidth={calcMaxXRwidth} />
			</Col>
			<Col className="d-flex flex-column align-items-start">
			  <Row id="rowFltCtl" className="pl-2 pr-0 pt-1 mt-2 mb-0 d-flex justify-content-start align-items-start"
				           style="padding-bottom:8px;border-bottom: 1px solid #ddd;">
					<Col className="d-flex flex-column text-align-center justify-content-center align-items-center col-auto">
					   <span class="br-xck-caption align-self-start"><br />Keep sample counts for:</span>
							{ xtcols.map( (xn, xt)=>
							<div key={`ckXt${xt}`} class="ml-1 row d-flex align-self-center flex-row xt-ckbox">
						    <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
								<span class='ckbox-br-xt'>
								   <span style={ { height:'18px', marginLeft:'-30px', marginRight: '4px', backgroundColor: xtcolors[xt] }}>&nbsp;#&nbsp;</span>
									 {xn}
								</span>
							   <CustomInput type="checkbox" id={`ckXt${xt}`} onClick={ () => toggleXType(xt)} checked={m.showXType[xt]} />
						    </div>
							 </div>
							) }
					</Col>
					<Col className="d-flex flex-column text-align-center justify-content-center align-items-start"
					                style="border-left:3px solid #ccc;" >
          { byRegion ? <span class="br-xck-caption"><b> Filter to subjects that have <br /> in the same region:</b></span>
					   : <span class="br-xck-caption"><br /><b>Filter to subjects that have:</b> </span>
					}

					{ xtcols.map( (xn, xt)=>
							<div key={`ckAllXt${xt}`} class="pl-4 ml-1 row d-flex align-self-start flex-row xt-ckbox">
						    <div className="ckbox-label" data-toggle="tooltip" data-placement="right" title="" >
							   <CustomInput type="checkbox" id={`ckAllXt${xt}`} onClick={ () => toggleReqXType(xt)} checked={m.reqXType.has(xt)} />
								 <span> {xn} samples </span>
						    </div>
							 </div>
							) }
					</Col>
			  </Row>
				<Row id="relSumBox" className="pl-0 pr-0 pt-1 mt-2 d-flex justify-content-start align-items-start">
				 <RSelSummary browse brSet={m.brSet} getBrowseTable={getBrowseTable} />
    	 </Row>

			</Col>
		 </Row>
	</div>);
}

export default BrBrowse;
