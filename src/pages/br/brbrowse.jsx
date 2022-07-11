import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState, useReducer, useRef} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label, CustomInput} from 'reactstrap';
import axios from 'axios'
import {rGlobs, changeXType, RDataProvider, FltCtxProvider, dtaNames, dtFilters,
	useFltCtx, dtaBrains, dtBrXsel, refineBrXsel_byXt, dtBrCounts, dtaBrIdx, br2Smp, useFltCtxUpdate,
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

//const columns=['#','Bint', 'Dx', 'Anc.', 'Sex', 'Age','RnaSeq', 'DNAm', 'WGS', ' dropped ' ];

const xtcols=['RNAseq', 'DNAm', 'WGS'] // adjust this in the future as other exp data types are added
const xtcolors=['#c9e9d1', '#bfdeff', '#f6cdd1' , '#fff0c1',  '#dbd0f0']
//                 green,    blue,     red    ,   yellow,       purple
const xtgrey='#cdcdcd'
const numsortCols=[   1,                               5,     6,       7,      8,      9]
const basecols=['#','BrNum', 'Dx', 'Ancestry', 'Sex', 'Age', 'PMI' ] //region columns to be added
const stickyCols=3; //stick #, BrNum, Dx
const stickyWs=[ 54, 64, 76 ]; //pixels

function eqSets(s1, s2) {
	if (s1.size!==s2.size) return false
  for (let e of s1) if (!s2.has(e)) return false;
	return true;
}
// update brSet to have only the entries in dtBrXsel with
// having samples in all the exp. types in reqXtSet
//
function prepTable(byRegion, mcache) {
  if (mcache && mcache.brnum==dtBrXsel.size && mcache.byRegion==byRegion)
      return [ ... mcache.r_data ] // [ rcols, rds ] did not change since last render
	const brseldata=[]
	const rds=[]
	let rcols=null
  console.log("}{}{}{}>> prepTable() called with byRegion=", byRegion)
	//every render - prepare brseldata
	if (byRegion) {
		//TODO : build rds rows
		rcols=dtaNames.reg.slice(1) //just region names
		dtBrXsel.forEach( brix=> {
		  const [brint, dxix, raix, six, age, pmi, ...rest]=dtaBrains[brix] //  [ brint,  dx-idx, race-idx, sex-idx, age, pmi, has_seq, has_geno, dropped ]
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
       rds.push([brix, brint, dxix, raix, six, age, pmi, ...rxtcounts])
		})
    if (mcache) { //memoize this
       mcache.brnum=dtBrXsel.size;
       mcache.byRegion=byRegion;
       mcache.r_data=[rcols, rds]
    }
		return [rcols, rds]
	}
  // simplified table, only total sample counts per experiment data type
  // rds should be array of [brint, dxix, raix, six, age, pmi, counts...]
	dtBrXsel.forEach( brix=> {
		const [brint, dxix, raix, six, age, pmi, ...rest]=dtaBrains[brix] //  [ brint,  dx-idx, race-idx, sex-idx, age, pmi, has_seq, has_geno, dropped ]
		const counts=[]
		xtcols.forEach( (v,xt)=> {
			let sd = br2Smp[xt];
			let snum = 0
			if (sd && sd[brix]) snum=sd[brix].length;
			counts.push(snum)
		})
		rds.push([brix, brint, dxix, raix, six, age, pmi, ...counts])
   })

   if (mcache) { //memoize this
    mcache.brnum=dtBrXsel.size;
    mcache.byRegion=byRegion;
    mcache.r_data=[xtcols, rds]
  }
  return [xtcols, rds]
}

function tableFilter(tblrows, brset) {
	const rows=[]
  tblrows.forEach( r => {
		if (brset.has(r[0])) rows.push(r)
	})
	return rows
}



function getBrTblRow(rd, brix, i) {
	const [brint, dxix, raix, six, age, pmi, hasSeq, hasGeno, dropped]=rd;
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
		<td>{i}.</td>	<td>Br{brint}</td><td>{dtaNames.dx[dxix]}</td>
		<td>{dtaNames.race[raix]}</td> <td>{dtaNames.sex[six]}</td>	<td>{age}</td> <td>{pmi}</td>
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
  })
	const m=refData.current

	function renderRow(r, rd, byRegion, showXTs) { //
		if (!showXTs || showXTs.length==0) {
			showXTs=new Array(xtcols.length).fill(true)
		 }
		const shcounts=[]
		const shcolors=[]
		xtcols.forEach( (e,i)=> {
			if (showXTs[i]) {
				shcolors.push(xtcolors[i])
			}
	  })
    /* () => {
								const shrc=[]
								rc.forEach( (c,j) => {
									if (showXTs[j]) shrc.push(c)
								})
    */
		if (byRegion) { // rd is rds.push([brint, dxix, raix, six, age, pmi, ...rxtcounts]
			// rxtcounts are per-region arrays of counts (one for each xtype in every array)
			const [brix, brint, dxix, raix, six, age, pmi, ...rxtcounts]=rd
			const outrd=[`${r+1}.`, `Br${brint}`, `${dtaNames.dx[dxix]}`, `${dtaNames.race[raix]}`,
							`${dtaNames.sex[six]}`, age, pmi]
			let lacc=0;
			return(<tr key={`tr${r}`}>{
			outrd.map(  (e,i)=> {
					if (i && i<=stickyCols) lacc+=stickyWs[i-1]
					let cl=null, st=null;
					if (i<stickyCols) {
						 cl="app-sticky";
						 let w=stickyWs[i];
						 if (i==stickyCols-1) w-=1;
						 st=`min-width:${w}px;max-width:${w}px;left:${lacc}px;`
					}
					return ((i==stickyCols-1) ?  <td key={`r${r}td${i}`} class={cl} style={st}><span>{e}</span></td>
							: <td key={`r${r}td${i}`} class={cl} style={st}> {e} </td>)
				})}
				{ //now output the region counts, by xtype in each region
					rxtcounts.map( (rc,i)=>{
							const shrc=[]
							rc.forEach( (c,j) => {
								if (showXTs[j]) shrc.push(c)
							})
				      return(<td key={`r${r}tc${i}`}> {
							  shrc.map( (c, j) => {
								   const cl=shcolors[j] //FIXME: j => xt mapping needed here if there is an exp type filter
								   return (<span key={`r${r}c${i}x${j}`} class={ c ? "rxtc" : "rxtc0"}
									         style={ c ? {backgroundColor: cl } : null } >{c}</span>) } )
					        }	 </td>) })
			 }
		</tr>)
	 }
		// --simplified rd: [brint, dxix, raix, six, age, pmi, counts...]
	 const [brix, brint, dxix, raix, six, age, pmi, ...counts] =rd;
	 const outrd=[`${r+1}.`, `Br${brint}`, `${dtaNames.dx[dxix]}`, `${dtaNames.race[raix]}`,
							`${dtaNames.sex[six]}`, age, pmi]
	 let lacc=0

	 counts.forEach( (e,i)=> {
			  if (showXTs[i]) {
					shcounts.push(e)
					shcolors.push(xtcolors[i])
				}
		 })
		 return(<tr key={`tr${r}`}>{
				outrd.map(  (e, i)=> {
				 if (i && i<=stickyCols) lacc+=stickyWs[i-1]
				 let cl=null, st=null;
				 if (i<stickyCols) {
						cl="app-sticky";
						let w=stickyWs[i];
						if (i==stickyCols-1) w-=1;
						st=`min-width:${w}px;max-width:${w}px;left:${lacc}px;`
				 }
				 return ((i==stickyCols-1) ?  <td key={`r${r}td${i}`} class={cl} style={st}><span>{e}</span></td>
							 : <td key={`r${r}td${i}`} class={cl} style={st}> {e} </td> )
				 //return (<td key={i}> {e} </td>)
			 })}
			 { //now output the total sample counts by exp. type
			 shcounts.map( (c, j)=>{
				 let spcl=null, color=null;
				 spcl= c>0 ? "xtc" : "xtc0";
				 color=shcolors[j]
				 return (<td key={`r${r}td${j+basecols.length}`}>
						 <span class={spcl} style={ c>0 ? {backgroundColor: color } : null }>{c}</span>
						 </td>)
				 })
			 }
		 </tr>)
	 }
	 function renderHeader(tblhdr) {
		 let lacc=0
		 return ( tblhdr.map(  (e,i)=> {
				 if (i && i<=stickyCols) lacc+=stickyWs[i-1]
				 let cl="app-sticky-top", st=null;
				 if (i<stickyCols) {
						cl="app-sticky-top-l";
						let w=stickyWs[i];
						if (i==stickyCols-1) w-=1;
						st=`min-width:${w}px;max-width:${w}px;left:${lacc}px;`
				 }
				 return ((i==stickyCols-1) ? <td key={`h${i}`} class={cl} style={st}> <span>{e}</span></td>
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
		props.tblCols.forEach( (e,i)=> {
			if (props.showXType[i]) cntcols.push(e)
		})
	}

  const tblrows = tableFilter( props.tblRows, props.brSet )
  const tblhdr=[...basecols, ...cntcols]
	//<Col className="d-flex flex-row-reverse align-items-start justify-content-start m-0 p-0 overflow-auto"
	let wstyle=null
	const byRegion=props.byRegion
	const showXTs= props.showXType
	if (byRegion && props.calcMaxWidth) {
		const maxw=props.calcMaxWidth();
		 //console.log("   setting max-width to: ", maxw)
		 if (maxw>0)
		   wstyle=`max-width:${maxw}px;`
	}
  const tbclass=byRegion ? "brtbl bregxt flex-shrink-1" : "brtbl flex-shrink-1"

	//console.log(" ~~~~ rendering BrTable with props.byRegion:", props.byRegion);
	return (<Col id="br-tbl-rx-col" className="d-flex flex-row-reverse flex-shrink-1 align-items-start justify-content-start m-0 p-0 overflow-auto"
	           style={wstyle}>
	 <table class={tbclass}><thead>
		<tr key="t0">
      { renderHeader(tblhdr) }
		</tr>
		</thead><tbody>
	  { tblrows.map( (rd, i)=> renderRow(i, rd, byRegion, showXTs))  }
    </tbody></table>
		</Col>);
}
// ------------------- page content starts here
const BrBrowse = ( ) => {
     const refData=useRef( {
         tblkey:1,
				 showXType: new Array(xtcols.length).fill(true),
				 allXType: new Set(),
				 brSet:null,
				 tblCols:[], //as built by prepTable()
				 tblRows:[], //as built by prepTable()
				 // --- cache
         cache: { brnum:0, byRegion:false, r_data: [null, null] },
			   relWidth:0
		 })
     //const [winWidth, setwinWidth]=useState(0)
		 const m=refData.current;
     const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
		 const [byRegion, setByRegion]=useState(false)
		 const [, forceUpdate] = useReducer((x) => x + 1, 0);
		 //const [brSet, setBrSet] = useState(null)

		 function toggleByRegion() {
			  if (!byRegion) {
           m.relWidth=$('#relSumBox').width()
					 //console.log(" relwdith: ", m.relwidth)
				}
       //m.tblkey++;
			 m.allXType.clear()
			 const newV=!byRegion;
			 [m.tblCols, m.tblRows]=prepTable(newV, m.cache)
			 setByRegion( newV )
		 }

    function calcMaxXRwidth() {
			return (window.innerWidth - m.relWidth-78);
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
		 [m.tblCols, m.tblRows]=prepTable(byRegion, m.cache);
		 m.brSet=new Set()
		 if (m.allXType.size==0 || m.allXType.size==xtcols.length) {
			dtBrXsel.forEach( brix=> {
				m.brSet.add(brix)
			})
		 }
     //filter according to m.allXType


	 }

	 function toggleXType(xt) {
		 m.showXType[xt] = !m.showXType[xt]
		 //must trigger re-render to rebuild BrTable
		 m.tblkey++;
		 forceUpdate();
	 }


	 function toggleAllXType(xt) {
		 if (m.allXType.has(xt))
		    m.allXType.delete(xt)
		 else m.allXType.add(xt)
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

	if (!m.brSet) prepBrSet(m.allXType) //this rebuilds m.brSet
  //console.log(" ~~~~~~~~~ rendering BrBrowse() m =", m);
  return (<div class="col-12 d-flex flex-column">
	   {/*<Row className="pt-1">
			 &nbsp;
		   <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Brain table</Button>
		 </Row>*/}
		 <Row id="brTblContainer" className="d-flex flex-grow-1 pt-0 mt-0 mr-0 pr-0 justify-content-center flex-nowrap">
		  {/* <Col className="d-flex mr-0 pr-0 flex-grow-1 align-self-stretch" > */}
			  <Col className="d-flex flex-column align-items-end justify-content-end mb-1">
					<Row className="d-flex flex-row justify-content-center m-1 pt-1">
					<div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
      					 <CustomInput type="checkbox" id="ckByRegion" onClick={toggleByRegion} checked={byRegion} />
								 Show sample counts by brain region
  		  		  </div>

					</Row>
					{/* <Row className="m-1 pt-1 h-100"> */}
		   	    <BrTable key={m.tblkey} tnum={tbl} byRegion={byRegion} tblCols={m.tblCols} tblRows={m.tblRows} brSet={m.brSet}
						       showXType={m.showXType} calcMaxWidth={calcMaxXRwidth} />
			</Col>
			<Col className="d-flex flex-column align-items-start">
			  <Row id="rowFltCtl" className="pl-2 pr-0 pt-1 mt-2 mb-0 d-flex justify-content-start align-items-start"
				           style="padding-bottom:8px;border-bottom: 1px solid #ddd;">
					<Col className="d-flex flex-column text-align-center justify-content-center align-items-center col-auto">
					   <span class="br-xck-caption align-self-start"><br /> Show sample counts for:</span>
							{ xtcols.map( (xn, xt)=>
							<div key={`ckXt${xt}`} class="pl-4 ml-1 row d-flex align-self-start flex-row xt-ckbox">
						    <div className="ckbox-label" data-toggle="tooltip" data-placement="right" title="" >
								<span class='ckbox-br-xt'>
								   <span style={ { height:'18px', marginRight: '4px', backgroundColor: xtcolors[xt] }}>&nbsp;&nbsp;&nbsp;</span>
									 {xn}
								</span>
							   <CustomInput type="checkbox" id={`ckXt${xt}`} onClick={ () => toggleXType(xt)} checked={m.showXType[xt]} />
						    </div>
							 </div>
							) }
					</Col>
					<Col className="d-flex flex-column text-align-center justify-content-center align-items-start"
					                style="border-left:1px solid #dfdfdf;" >
          { byRegion ? <span class="br-xck-caption">Only show brains having <br /> in the same region:</span>
					   : <span class="br-xck-caption"><br />Only show brains with:</span>
					}

					{ xtcols.map( (xn, xt)=>
							<div key={`ckAllXt${xt}`} class="pl-4 ml-1 row d-flex align-self-start flex-row xt-ckbox">
						    <div className="ckbox-label" data-toggle="tooltip" data-placement="right" title="" >
							   <CustomInput type="checkbox" id={`ckAllXt${xt}`} onClick={ () => toggleAllXType(xt)} checked={m.allXType.has(xt)} />
								 <span> {xn} samples </span>
						    </div>
							 </div>
							) }
					</Col>
			  </Row>
				<Row id="relSumBox" className="pl-0 pr-0 pt-1 mt-2 d-flex justify-content-start align-items-start">
				 <RSelSummary browse brSet={m.brSet} />
    	 </Row>

			</Col>
		 </Row>
	</div>);
}

export default BrBrowse;
