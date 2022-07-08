import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState, useRef} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label, CustomInput} from 'reactstrap';
import axios from 'axios'
import {rGlobs, changeXType, RDataProvider, FltCtxProvider, dtaNames, dtFilters,
	useFltCtx, dtaBrains, dtBrXsel, dtBrCounts, dtaBrIdx, br2Smp, useFltCtxUpdate,
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
const stickyWs=[ 54, 64, 64 ]; //pixels
function prepTable(byRegion) {
	const brseldata=[]
	const rds=[]
	let rcols=null
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
       rds.push([brint, dxix, raix, six, age, pmi, ...rxtcounts])
		})
		console.log(rcols, rds)
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
		rds.push([brint, dxix, raix, six, age, pmi, ...counts])
   })
  return [xtcols, rds]
}

function renderRow(i, rd, byRegion) { //
 if (byRegion) {
	return  (<tr key={i}>
		  </tr>)
 }
 // --simplified rd: [brint, dxix, raix, six, age, pmi, counts...]
  const [brint, dxix, raix, six, age, pmi, ...counts] =rd;
	const outrd=[`${i+1}.`, `Br${brint}`, `${dtaNames.dx[dxix]}`, `${dtaNames.race[raix]}`,
           `${dtaNames.sex[six]}`, age, pmi, ...counts]
		let lacc=0
	return(<tr key={i+1}>{
	   outrd.map(  (e,i)=> {
		  if (i && i<=stickyCols) lacc+=stickyWs[i-1]
			const cl= i<stickyCols ? "app-sticky" : null ;
			const st=(i<stickyCols) ? `min-width:${stickyWs[i]}px;max-width:${stickyWs[i]}px;left:${lacc}px;` : null;
	    return (<td key={i} class={cl} style={st}> {e} </td>)
			//return (<td key={i}> {e} </td>)
		} ) }
	</tr>)
}
function renderHeader(tblhdr) {
  let lacc=0
	return ( tblhdr.map(  (e,i)=> {
		  if (i && i<=stickyCols) lacc+=stickyWs[i-1]
			const cl=stickyCols ? (i<stickyCols ? "app-sticky-top-l":"app-sticky-top") : null ;
			const st=(i<stickyCols) ? `min-width:${stickyWs[i]}px;max-width:${stickyWs[i]}px;left:${lacc}px;` : null;
	    return (<td key={i} class={cl} style={st}> {e} </td>)
		} ) )
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
		sortup: false //sorting direction
  })
	const m=refData.current

  /*
	useEffect(  ()=>{
		// resize the header and body columns to align
		const table = $('.brtbl'),
		  bodyRow1Cells = table.find('tbody tr:first').children(), //first row
			//bodyRows = table.find('tbody tr'), //all body rows
			thead =  table.find('thead tr');
		  // Get the tbody columns width array
			let i=-1
		  let bWidths = bodyRow1Cells.map( function() {
				   //debug only:
           if (i>stickyCols) $(this).css('min-width', 120);
				   i++;
		       return i<stickyCols ? stickyWs[i] : $(this).width()  }).get();
		 console.log(" bWidths: ", bWidths)
			i=-1;
 		  let hWidths = thead.children().map( function() {
  			    //$(this).addClass('clhead');
						i++;
						return i<stickyCols ? stickyWs[i] : $(this).width()  }).get();
				 // Set the width of thead columns
		  thead.children().each((i, v) => {
		     $(v).width(Math.max(bWidths[i], hWidths[i]) )
				});

			bodyRow1Cells.each( (i,v)=>{
				$(v).width(Math.max(bWidths[i], hWidths[i]))
			})

	}) */

  function sortByCol(e) {
		  let t=$(e.target)
	}

  const [ cntcols, tblrows] = prepTable(props.byRegion);
  const tblhdr=[...basecols, ...cntcols]
	return (<Col className="d-flex flex-row-reverse align-items-start justify-content-start m-0 p-0 overflow-auto" >
	<table class="brtbl"><thead>
		<tr key="t0">
      { renderHeader(tblhdr) }
		</tr>
		</thead><tbody>
	  { tblrows.map( (rd, i)=> renderRow(i, rd, props.byRegion))  }
    </tbody></table>
		</Col>);
}
// ------------------- page content starts here
const BrBrowse = ( ) => {

     const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
		 const [byRegion, setByRegion]=useState(false)
		 function toggleByRegion() {
			 setByRegion( prev=> !prev )
		 }

    function onBtnClick(e) {
       const id=e.target.id;
		   switch (id) {
			   case "b1": setTable(1);
			           break;
		  	 default:
		 }
	 }

   useEffect(() => {
    $('.toast').toast({ delay: 7000 })
    setupTooltips()
    return ()=>{ //clean-up code
       clearTooltips()
    }
	 }, []);

   if (!anyActiveFilters(true)) {
		 return (<div class="col-12 d-flex flex-column">
			 <Row className="pt-3 d-flex flex-nowrap flex-row align-items-center justify-content-center">
			   <Col><div style="color:#d23;line-height:200%;font-size:100%;">
          <span>Please make a selection in the <b>Select</b> tab</span>
         </div>
				 </Col>
		 </Row></div>)
	 }

	return (<div class="col-12 d-flex flex-column bred">

	   {/*<Row className="pt-1">
			 &nbsp;
		   <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Brain table</Button>
		 </Row>*/}
		 <Row className="d-flex flex-grow-1 pt-0 mt-0 mr-0 pr-0 justify-content-center flex-nowrap bgreen">
		  {/* <Col className="d-flex mr-0 pr-0 flex-grow-1 align-self-stretch" > */}
			  <Col className="d-flex flex-column align-items-end justify-content-end mb-1 bblue"  >
					<Row className="d-flex flex-row justify-content-center m-1 pt-1">
					<div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="" >
      					 <CustomInput type="checkbox" id="ckByRegion" onClick={toggleByRegion} checked={byRegion} />
								 Show sample counts by brain region
  		  		  </div>

					</Row>
					{/* <Row className="m-1 pt-1 h-100"> */}
		   	    <BrTable tnum={tbl} byRegion={byRegion} />
			</Col>
			<Col className="d-flex align-items-start bred">
				{/* <Label>{dtBrXsel.size} subjects selected.</Label> */}
				<Row className="pl-0 pr-0 pt-1 mt-4 d-flex justify-content-start align-items-start bgreen">
				 <RSelSummary browse />
    	 </Row>

			</Col>
		 </Row>
	</div>);
}

export default BrBrowse;
