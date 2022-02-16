import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';
import AgeRangeEntry from '../../comp/agerange';
import {rGlobs, changeXType, RDataProvider, FltCtxProvider, dtaNames, dtFilters, 
	     useFltCtx, useFltCtxUpdate, useRData, clearFilters} from '../../comp/RDataCtx';

import FltMList from '../../comp/FltMList';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
     Row, Col, Input, Button, Label} from 'reactstrap';
import RSelSummary from '../../comp/RSelSummary';
import {useMxSel, MxSelProvider} from './mxSelCtx';
import RMatrix from './RMatrix';

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
		  if (selregs[i]) {
			  /*
			  const num=mxvals[selcol-1][i+1];
			  //total+=mxvals[i][selcol-1];
			  if (num) {
			    regions.push(dtaNames.reg[i+1]);
			    regc.push(num);
			  }*/
			  nhregs++;
		  }
		}
		/*
		clist=
		   <ul>
			   { regions.map( (it, i)=>
                 <li>{it} ({regc[i]})</li>
			   )}
		   </ul>
		*/
	}
	return (<Row class="m-0 mt-3 ml-2 mr-2 trinfo justify-content-center" 
	       style="width:20rem;font-size:85%;color:#e68">
		{nhregs ? <> {nhregs} highlighted regions <br /> 
		        Only subjects having {expType} samples in <br /> these brain regions
				  will be counted
		</> : null}
         
	</Row>)
}
const BrMatrix = ({  tab, selData , style }) => {
	//if (tab!=='exp' && tab!=='rep') tab='sel'
	const [, , , dataLoaded] = useRData()    
	const notifyUpdate = useFltCtxUpdate(); 
    const [showZero, setShowZero] = useState(false);
	const [forceUpdate, setForceUpdate] = useState(false);
    const [ageRangeState, setAgeRangeState]=useState([0,16,62]); // [ageRangeEnabled, agemin, agemax]
	console.log(" BrMatrix dataLoaded status: ", dataLoaded)
	if (!dataLoaded) return <h3>Loading..</h3> 
	console.log(" BrMatrix page rendering.. ")

	// data loaded, we are safe to show the pages for this data type
    //changeXType(0); //update counts etc.
    //rGlobs.rebuildRMatrix=true;

    function ageRangeChange(v) {
		   //console.log(" BrainSelect.ageRangeChange called with v = ", v);
           setAgeRangeState(v);
	}
    
   function resetFilters() {
	   clearFilters();
	   setForceUpdate(!forceUpdate);
	   notifyUpdate('clear');
   }

    function toggleZeroCounts(e) {
        let v=e.target.checked;
        setShowZero(v);
		notifyUpdate('zero');
    }
    //console.log(">> rendering RnaSelect parent with ageRangeState :", ageRangeState);
	/*
		  <AgeRangeEntry min={-1} max={110} enabled={ageRangeState[0]} vmin={ageRangeState[1]} vmax={ageRangeState[2]} onChange={ageRangeChange} />
			<br /><br />
    */
	return (<div style={style}>
  	<Row class="flex-nowrap">
 	   <Col xs="3">
		<Row class="d-flex pl-4 mt-2 pt-2 justify-content-end">
				   <div class="float-left ckzerotoggle">
				      <span class="ckbleftlabel">Show not sequenced</span>
					  <label class="custom-control custom-checkbox">
					  <Input type="checkBox" class="custom-control-input" onChange={toggleZeroCounts} />
					   <span class="custom-control-label"> </span>
					 </label>
					</div>
		 </Row>
         <Row class="d-flex justify-content-end">
		    <div class="float-right">
             <FltMList id="sex" type="htoggle" width="12rem" showZero={showZero} />
			</div>
         </Row>
         <Row class="d-flex justify-content-end">
		    <div class="float-right">
            <FltMList id="age" width="12rem" showZero={showZero} />
			</div>
         </Row> 
         <Row class="d-flex justify-content-end">
		    <div class="float-right">
			<FltMList id="race"  height="12rem" width="12rem" showZero={showZero} />
		   </div>
	    </Row>
		<Row class="d-flex justify-content-end pt-4 mt-3">
			 <Button outline color="danger"  onClick={resetFilters}
			 style="line-height:80%;font-size:90%">Clear selection</Button>
   	   </Row>


	  </Col>
	  <MxSelProvider>
	  <Col xs="5" class="matrixCol">
		<Row class="mt-2">
                <Col class="col-4 matrixWrap">
                  <RMatrix />
                </Col>    
		</Row>
	  </Col>
	  <Col xs="4" style={{ minWidth: "26rem"}}>
	    <Row class="mt-0 p-0 d-flex justify-content-start flex-nowrap">
		   <Col class="float-left">
			 <TrPanel />
			 <Row class="d-flex pt-0 mt-0 justify-content-start"> 
			 <div class="float-left" style="width:24rem"> 
			  <FltMList id="dx" width="13rem" showZero={showZero} /> 
			  </div>
			 </Row>
		   </Col>
         </Row>
	     <Row class="d-flex justify-content-start">
		    <div class="float-left" style="width:24rem">
  			 <RSelSummary />
			</div>
         </Row>
	  </Col>
	  </MxSelProvider>
	</Row>
  </div>);
}

export default BrMatrix;
