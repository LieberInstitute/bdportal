import { h } from 'preact';
import {useEffect, useState, useReducer} from "preact/hooks";
import './style.css';
import '../../comp/ui.css';
//import {AgeRange, fullAgeRange} from '../../comp/AgeRange'
import {useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
	    applyFilterSet, applyFilterCond, clearFilters} from '../../comp/RDataCtx'

import {FltMList} from '../../comp/FltMList';
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import RSelSummary from '../../comp/RSelSummary'
import {useMxSel, MxSelProvider} from './mxSelCtx'
import RMatrix from './RMatrix'

// the top-right info panel- show numeric summary of filters?
//items is an array of text lines to show
function TrPanel( ) {
	const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update this component
	//
	const [selcol, selregs, mxvals, dtxs] = useMxSel(); //when Matrix regions are clicked this gets updated
    let nhregs=0; //number of hilighted regions (not necessarily applied!)
	let clist='';
	const regions=[];
	const regc=[];
	let expType='';
	if (selcol>0) { // selcol-1 : experiment type
		expType=['RNASeq', 'DNAm', 'WGS', 'scRNAseq', 'long RNAseq' ][selcol-1];
		for (let i=0;i<selregs.length; i++) {
		  if (selregs[i])
			  nhregs++;
		}
	}
	return (<Row className="m-0 p=0 ml-3 mr-2 trinfo justify-content-center"
	       style="width:20rem;font-size:85%;color:#e68;min-height:4rem;">
		{nhregs ? <> {nhregs} highlighted regions <br />
		        Only subjects having {expType} samples in <br /> these brain regions
				  will be counted
		</> : null}

	</Row>)
}



const BrMatrix = ({  tab, style }) => {
	//if (tab!=='exp' && tab!=='rep') tab='sel'
	const [, , , dataLoaded] = useRData()
	const notifyUpdate = useFltCtxUpdate();
    const [showZero, setShowZero] = useState(false);
	const [, forceUpdate] = useReducer((x) => x + 1, 0);
    //const [ageRangeState, setAgeRangeState]=useState([0,16,62]); // [ageRangeEnabled, agemin, agemax]
	//console.log(" BrMatrix dataLoaded status: ", dataLoaded)
	if (!dataLoaded) return <h3>Loading..</h3>

	// data loaded, we are safe to show the pages for this data type
    //changeXType(0); //update counts etc.
    //rGlobs.rebuildRMatrix=true;
	/*
	function ageFilterChange(ageMin, ageMax) {
		if (ageMin==fullAgeRange[0] && ageMax==fullAgeRange[1])
		 console.log("Age filter cleared!");
		else
		 console.log("Age filter changed to: ", ageMin, ageMax)
	  }
	*/
	  function resetFilters() {
		 clearFilters()
		 //forceUpdate()
		 //setHideNoSeq(false)
		 //setHideNoGeno(false)
		 notifyUpdate('clear')
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
	
	   function applyFilter(fid) {
		 applyFilterSet(fid)
		 notifyUpdate(fid)
	   }
	
	  console.log(">>------------- rendering brmatrix page!")
	
	  const dtaSex=getFilterData('sex')
		const dtaAge=getFilterData('age')
		const dtaDx=getFilterData('dx')
		const dtaRace=getFilterData('race')
	  const flt_onlySeq=getFilterCond('with_seq')
	  const flt_onlyGeno=getFilterCond('with_gt')
	
	  //console.log(" -- page render with flt_onlySeq=", flt_onlySeq);
	  return(<div class="col-12 d-flex flex-column">
		<MxSelProvider>
		<Row className="pl-2 pt-2 pb-0 d-flex flex-nowrap justify-content-center ">
		 <Col xs="3" className="colDemo" style={{height:" 3.4rem"}}> &nbsp;
			<div class="col d-flex justify-content-between align-self-start ckRow">
			  <div class="col-6 d-flex">
				<div class="row pl-0 d-flex justify-content-begin align-self-center">
				  <Button outline color="danger" className="align-self-start" onClick={resetFilters}
					style="line-height:80%;font-size:80%;margin-top:-3px;">Clear selection</Button>
				</div>     
			  </div>
			  <div class="col-6 d-flex flex-column">
				<div class="row mx-auto">
				  <div className="ckbox-label" >
					<CustomInput type="checkbox" id="ckOnlyGenotyped" onClick={toggleOnlyGeno} checked={flt_onlyGeno} />
					Genotyped
				  </div>
				</div>
				<div class="row mx-auto">
				  <div className="ckbox-label" >
					<CustomInput type="checkbox" id="ckOnlySeq" onClick={toggleOnlySeq} checked={flt_onlySeq} />
					Sequenced
				  </div> 
				</div>
			 </div>
		   </div>
		 </Col>
		 <Col xs="5" className="colMatrix d-flex align-self-start">  </Col>
		 <Col xs="4" className="pl-3 colSummary align-self-start"> 
			 <Row className="m-0 p-0 mr-1 pr-1 mt-1 d-flex justify-content-begin">
				  <TrPanel />
			  </Row>
		 </Col>
		</Row>
		  <Row className="flex-grow-1 pt-1 mt-0 justify-content-center">
			 <Col xs="3" className="colDemo" >
		   <Col className="d-flex flex-column col-vscroll"  >
			<Row className="d-flex justify-content-begin">
			  <FltMList id="dx" width="14rem" height="8rem" sort data={dtaDx} filter={getFilterSet} onApply={applyFilter} updateFilter />
			</Row>
			<Row className="d-flex justify-content-begin">
				 <FltMList id="sex" type="htoggle" width="14rem" data={dtaSex} filter={getFilterSet} onApply={applyFilter} updateFilter />
			</Row>
			<Row className="d-flex justify-content-begin">
				 <FltMList id="age" width="14rem" data={dtaAge} filter={getFilterSet} onApply={applyFilter} updateFilter />
			</Row>
			<Row className="d-flex justify-content-begin">
					   <FltMList id="race" width="14rem" height="5.4rem" data={dtaRace} filter={getFilterSet} onApply={applyFilter} updateFilter />
			</Row>
		   </Col>
			</Col>
		 
		  <Col xs="5" className="pt-0 mt-0 colMatrix align-self-start">
			<Row className="mt-0 pt-0">
				<Col className="col-4 matrixWrap">
				  <RMatrix />
				</Col>
			</Row>
		  </Col>
		  <Col xs="4" className="colSummary">
			<Col className="d-flex flex-column col-vscroll" >
			  <Row className="pt-0 mt-0 d-flex justify-content-begin">
				  <RSelSummary />            
			  </Row>
			</Col>
		  </Col>
		</Row>
	  </MxSelProvider>
	  </div>)
	}

export default BrMatrix;
