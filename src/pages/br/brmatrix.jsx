/* eslint-disable no-lonely-if */
import { h } from 'preact';
import $ from 'jquery';
import {useEffect, useState, useRef, useReducer} from "preact/hooks";
import '../../comp/ui.css';
import './style.css';

import {useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
	applyFilterSet, applyFilterCond, applyBrList, clearBrListFilter,
	getBrListFilter, clearFilters, dtFilters, buildRSE, saveRStagedFile} from '../../comp/RDataCtx'

import {FltMList} from '../../comp/FltMList'
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'

import RSelSummary from '../../comp/RSelSummary'
import AgeDualPanel from '../../comp/AgeDualPanel'

import {useMxSel, MxSelProvider} from './mxSelCtx'
import RMatrix from './RMatrix'
import { clearTooltips, setupTooltips } from '../../comp/ui';

//import axios from 'axios'
import { MW_SERVER } from '../../appcfg'

// the top-right info panel - only used to spawn the brmatrix toast right now
// items is an array of text lines to show
function TrPanel( ) {
	const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update this component
	//
	//const [dlStatus, setDlStatus] = useState(0); // 0 = nothing, 1 = "preparing the file"
	const [ fDlPath, setFDlPath ] = useState(""); // ".." : loading, otherwise relative file path
	const [selcol, selregs, mxvals, dtxs] = useMxSel(); //when Matrix regions are clicked this gets updated

	let nhregs=0; //number of hilighted regions (not necessarily applied!)
	let clist='';
	const regions=[];
	const regc=[];
	let expType='';
	const refData = useRef({
			regSelApplied: false,
			showHint:false,
			expType:''
	})
	const m=refData.current
	if (selcol>0) { // selcol-1 : experiment type

	expType=['RNASeq', 'DNAm', 'WGS', 'scRNAseq', 'long RNAseq', 'small RNAseq' ][selcol-1];
		for (let i=0;i<selregs.length; i++) {
			if (selregs[i])
				nhregs++;
		}
	}
	if (nhregs && dtFilters.reg.size>0) m.regSelApplied=true
	m.showHint = (nhregs && !m.regSelApplied)
	m.expType=expType

	function bSaveClick() {
			//console.log("Save button clicked")
			//setDlStatus((v) => (v ? 0 : 1))
			setFDlPath('..')
			//Step 1 - show loading animation and submit the Post request
      buildRSE('tst_rse_gene_counts', ['R15930', 'R5637_C41CPACXX'], 'g')
			 .then( res => {
			   //Step 2 - download the relative file path name returned by Step 1
				 console.log("res=", res)
				 return res.json()
			  } )
			 .then( fn => {
					// 1st row: header, 2nd row: data = filename
					let fname=""
					if (fn.length>1) fname=fn[1][0]
          console.log("fn result:", fname)
					if (fname) {
						 let fn=fname.split('/')
						 setFDlPath(fn[fn.length-1]+' saved.')
					   //simulate a link->click to download the file:
					   saveRStagedFile(fname)
					}
			 })

			// saveRStagedFile(fname)
	}

	useEffect( ()=>{
				if (m.showHint) {
					$('#regSelInfo').toast('show')
				}
		} )

  const fileSaving= (fDlPath=='..')
	return (<Row className="m-0 p-0 ml-3 mr-2 trinfo justify-content-center align-items-center red-info-text"
	                 style="width:20rem;min-height:4rem;">

		{/*<Label style="position:relative;padding-right:4px;text-align:right;top:3px;width:13rem;"
			className={  fileSaving ? "blink-anim" : null }> { fileSaving ? "preparing..." : (fDlPath.length>2 ? fDlPath : " ")} </Label>
		<Button id="bsave" className="btn-sm app-btn" disabled={fileSaving} onClick={bSaveClick}>Save</Button>&nbsp;
		*/}
		<div class="position-fixed p-1" style="z-index: 15; top: 4em; right: 12em;">
		<div id="regSelInfo" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true" data-delay="2000">
			<div class="toast-header-sm">
				{/* <img src="..." class="rounded mr-2" alt="..." /> */}
				<strong class="mr-auto" style="color:#777;">Information</strong>
				{/* <small>11 mins ago</small> */}
				<button type="button" class="ml-2 mb-1 mr-1 close" data-dismiss="toast" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="toast-body mt-1 pt-0">
				Only subjects having {m.expType} samples in the <br /> selected brain regions
				will be considered after selection is applied
			</div>
		</div>
	</div></Row>)

/*
return (<Row className="m-0 p-0 ml-3 mr-2 trinfo justify-content-center align-items-center red-info-text"
		 style="width:20rem;min-height:4rem;">
{showHint ? <> Only subjects having {expType} samples in the <br /> selected brain regions
			will be considered
</> : null}

</Row>)
*/
}

const BrMatrix = ({  tab, style }) => {
//if (tab!=='exp' && tab!=='rep') tab='sel'
const [, , , dataLoaded] = useRData()
const notifyUpdate = useFltCtxUpdate();
//const [brloaded, setBrLoaded] = useState(0)

const [, forceUpdate] = useReducer((x) => x + 1, 0);

const [clearCounter, setClearCounter] = useState(0)

//const [ageRangeState, setAgeRangeState]=useState([0,16,62]); // [ageRangeEnabled, agemin, agemax]
//console.log(" BrMatrix dataLoaded status: ", dataLoaded)
const refData=useRef( {
	ageRange:false, //default: age bins
	updList: { sex:0, age:0, race:0, dx:0 }
})
const m=refData.current

useEffect(() => {
  $('.toast').toast({ delay: 7000 })
  setupTooltips()
  return ()=>{ //clean-up code
     clearTooltips()
  }
}, []);

//if (!dataLoaded) return <h3>Loading..</h3>

// data loaded, we are safe to show the pages for this data type
//changeXType(0); //update counts etc.
//rGlobs.rebuildRMatrix=true;

function resetFilters() {
  clearFilters()
  //forceUpdate()
  //setHideNoSeq(false)
  //setHideNoGeno(false)
	setClearCounter(clearCounter + 1)
  notifyUpdate('clear')
	//simply triggers refresh, but for some components we want to trigger remount
}

function onBrListLoad(brlist) {
	if (!brlist || brlist.length==0) {
		clearBrListFilter()
		setClearCounter(clearCounter + 1)
		notifyUpdate('clear-brlist')
		//setBrLoaded(0)
		return 0
	}
	const n=applyBrList(brlist)
	setClearCounter(clearCounter + 1)
	notifyUpdate('brlist')
	return n
}

function toggleOnlySeq(e) {
	let v=e.target.checked;
	applyFilterCond('with_seq', v)
	//setHideNoSeq(v); //
	notifyUpdate('sequenced');
}

function toggleOnlyGeno(e) {
let v=e.target.checked;
applyFilterCond('with_gt', v)
//setHideNoGeno(v); //
notifyUpdate('genotyped');
}

function applyFilter(oset, fid) {
 applyFilterSet(fid) //this calls updateCounts()
 notifyUpdate(fid)
}

function onAgeSelection(customRange) {
  notifyUpdate(customRange?'age-range':'age')
	m.ageRange=customRange
}

const dta={ sex : getFilterData('sex'),
             dx : getFilterData('dx'),
           race : getFilterData('race'),
   }

//console.log(">>------------- rendering brmatrix page!")

const flt_onlySeq=getFilterCond('with_seq')
const flt_onlyGeno=getFilterCond('with_gt')
const brloaded=getBrListFilter().size

//console.log(" -- page render with flt_onlySeq=", flt_onlySeq);
return(<div class="col-12 d-flex flex-nowrap flex-column">
<MxSelProvider>
<Row className="pt-0 mt-0 pb-0 mb-0 justify-content-center flex-nowrap">
<Col xs="2" className="d-flex flex-column m-0 p-0 pl-1 ml-1 colDemo align-self-stretch justify-content-center">
    <Row className="d-flex position-relative mb-0 pb-0 pl-0 justify-content-start align-self-stretch">
        <Col xs="5" className="d-flex justify-content-start align-items-center pr-0 mr-0">
            <Button outline color="danger" className="btn-sm align-self-center" onClick={resetFilters}
              data-toggle="tooltip" title="Clear all selections"
              style="line-height:80%;font-size:80%">Clear</Button>
        </Col>
        <Col className="d-flex flex-column m-0 p-0 ml-1 align-self-start justify-content-center noselect" style="height:32px;">
           <Row className="align-self-center m-0 p-0">
    				  <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="Consider only genotyped brains" >
      					 <CustomInput type="checkbox" id="ckOnlyGenotyped" onClick={toggleOnlyGeno} checked={flt_onlyGeno} />
  		 			    Genotyped
  		  		  </div>
  			  </Row>
           <Row className="align-self-center m-0 p-0">

             <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="Only sequenced brains with at least one data type">
  					    <CustomInput type="checkbox" id="ckOnlySeq" onClick={toggleOnlySeq} checked={flt_onlySeq} />
  					    Sequenced
  				   </div>
           </Row>
        </Col>
    </Row>
  </Col>
  <Col className="colMatrix d-flex align-self-start"><Row className="position-relative">
	      <div id="help-msg" class="app-help-panel align-self-center" style="margin-left:2px;margin-top:3rem;">
              <span class="info-tx-apply">Apply</span>  selections to create a set of subjects
							to browse, download <br /> or access their experiment data.
        </div>
		</Row>  </Col>
  <Col xs="4" className="d-flex flex-fill" style="z-index:-1;">
  		<Row className="m-0 p-0 mr-1 pr-1 d-flex justify-content-start">
  				 <TrPanel />
  		 </Row>
  </Col>
</Row>
<Row className="flex-grow-1 pt-0 mt-0 justify-content-center flex-nowrap">
  <Col xs="3" className="colDemo" >
     <Col className="d-flex flex-column col-vscroll"  >
        <Row className="d-flex justify-content-start">
           <FltMList key={`dx${clearCounter}_${m.updList['dx']}`} id="dx" width="15em" height="6.9em" data={dta.dx} filter={getFilterSet} onApply={applyFilter} updateFilter />
         </Row>
         <Row className="d-flex justify-content-start">
           <FltMList key={`sx${clearCounter}_${m.updList['sex']}`} id="sex" type="htoggle" width="15em" data={dta.sex} filter={getFilterSet} onApply={applyFilter} updateFilter />
         </Row>
         <AgeDualPanel key={`age${clearCounter}_${m.updList['age']}`} width="15em" onAgeSelection={onAgeSelection} />
         <Row className="d-flex justify-content-start" style="margin-top:2px;">
           <FltMList key={`race${clearCounter}_${m.updList['race']}`} id="race" width="15em" height="5.5rem" data={dta.race} filter={getFilterSet} onApply={applyFilter} updateFilter />
         </Row>
     </Col>
  </Col>

 <Col xs="5" className="pt-0 mt-0 colMatrix align-self-start">
	 <Row className="mt-0 pt-0">
			 <Col className="matrixWrap">
				 <RMatrix />
			 </Col>
	 </Row>
 </Col>
  {/* -- right column: RSelSummary  -- */}
  <Col xs="4" className="d-flex flex-fill ml-2" >
    <Row className="pt-0 mt-0 d-flex justify-content-center align-items-start">
      <RSelSummary brloaded={brloaded} onBrList={onBrListLoad} />
    </Row>
  </Col>
</Row>
</MxSelProvider>
</div>)
}

export default BrMatrix;