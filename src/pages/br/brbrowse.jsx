import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState, useRef} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label} from 'reactstrap';
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

const columns=['#','BrNum', 'Dx', 'Ancestry', 'Sex', 'Age', 'PMI', 'RNAseq', 'DNAm', 'WGS']
const numsortCols=[   1,                               5,     6,       7,      8,      9]

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

  useEffect(  ()=>{
		// resize the header and body columns to align
		const table = $('.brtbl'),
		  bodyCells = table.find('tbody tr:first').children(), //first row
			thead =  table.find('thead tr');
		  // Get the tbody columns width array
		  let bWidths = bodyCells.map( function() {
		       return $(this).width()   }).get();
 		 let hWidths = thead.children().map( function() {
  			    //$(this).addClass('clhead');
						return $(this).width()   }).get();
				 // Set the width of thead columns
		  thead.children().each((i, v) => {
		     $(v).width(Math.max(bWidths[i], hWidths[i]) ) });
		  bodyCells.each((i, v) => {
		    $(v).width(Math.max(bWidths[i], hWidths[i]))	});
 		  /* thead.children().on("click")
		  thead.children().on("click", function() {
				   const cid=$(this).index()
			} ) */

	})

  function sortByCol(e) {
		  let t=$(e.target)

	}

	const brseldata=[]
  dtBrXsel.forEach( (brix)=> {
				const r=dtaBrains[brix]
				brseldata.push([r, brix])
	})

	return (
	<table class="tbl tbldsets brtbl"><thead>
		<tr key="t0">
      { columns.map(  (e,i)=>
			    <td key={i}>  {e}
					</td>)
			}
		</tr>
		</thead><tbody>
	    { brseldata.map( (rix, i)=> {
         const [r, brix]=rix
         return getBrTblRow(r, brix, i+1);
	   }) }
    </tbody></table>);
}

const BrBrowse = ( ) => {

const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
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

	return (<div class="col-12 d-flex flex-column">

	   <Row className="pt-1">
			 &nbsp;
		  {/* <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Brain table</Button> */}
		 </Row>
	   {/* <Row className="justify-content-center mx-auto p-1 overflow-auto rowfh" >
		   <Col className="col-auto"><BrTable tnum={tbl} /></Col>
	   </Row> */}
		 <Row className="flex-grow-1 pt-0 mt-0 mr-0 pr-0 justify-content-center">
		  <Col xs="7" className="d-flex mr-0 pr-0" >
			  <Col className="d-flex align-items-start justify-content-end"  >
		   	  <BrTable tnum={tbl} />
			  </Col>
			</Col>
			<Col xs="5" className="d-flex align-items-start" >
				{/* <Label>{dtBrXsel.size} subjects selected.</Label> */}
				<Row className="pl-0 pr-0 pt-0 mt-0 d-flex flex-fill justify-content-start align-items-start">
				 <RSelSummary browse />
    	 </Row>

			</Col>
		 </Row>
	</div>);
}

export default BrBrowse;
