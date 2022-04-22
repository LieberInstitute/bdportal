import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';
import '../../comp/ui.css';
//import AgeRangeEntry from '../../comp/agerange';
import {RDataProvider, FltCtxProvider, useFltCtxUpdate, useRData, clearFilters,
   getFilterSet, applyFilterSet, getFilterData} from '../../comp/RDataCtx';

import {FltMList} from '../../comp/FltMList';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown, Row, Col, Button, Label} from 'reactstrap';
import RSelSummary from '../../comp/RSelSummary';

const RnaSelect = ({ style }) => {
	const notifyUpdate = useFltCtxUpdate(); 
	const [forceUpdate, setForceUpdate] = useState(false);

    /* const [ageRangeState, setAgeRangeState]=useState([0,16,62]); // [ageRangeEnabled, agemin, agemax]
    function ageRangeChange(v) {
		   console.log(" RNASelect.ageRangeChange called with v = ", v);
           setAgeRangeState(v);
	} */

	function resetFilters() {
		clearFilters()
		//forceUpdate()
		notifyUpdate('clear')
	  }
    //console.log(">> rendering RnaSelect parent with ageRangeState :", ageRangeState);
	/*
		  <AgeRangeEntry min={-1} max={110} enabled={ageRangeState[0]} vmin={ageRangeState[1]} vmax={ageRangeState[2]} onChange={ageRangeChange} />
			<br /><br />
    */

	function applyFilter(fid) {
		applyFilterSet(fid)
		notifyUpdate(fid)
	}
	 
  
		 
    const dtaSex=getFilterData('sex')
	const dtaAge=getFilterData('age')
	const dtaDx=getFilterData('dx')
	const dtaRace=getFilterData('race')
	const dtaProto=getFilterData('proto')
	const dtaDset=getFilterData('dset')
	const dtaReg=getFilterData('reg')
		 

	return (<div style={style}>
  	<Row>
 	   <Col xs="3">
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
             <FltMList id="sex" type="htoggle" width="12rem" data={dtaSex} filter={getFilterSet} onApply={applyFilter} updateFilter /> 
			</div>
         </Row>
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
            <FltMList id="age" width="12rem" data={dtaAge} filter={getFilterSet} onApply={applyFilter} updateFilter />
			</div>
         </Row> 
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
           <FltMList id="race"  height="12rem" width="12rem" data={dtaRace} filter={getFilterSet} onApply={applyFilter} updateFilter />
		   </div>
	    </Row>
		<Row className="d-flex justify-content-end pt-4 mt-3 pr-3 mr-2">
			 <Button outline color="danger"  onClick={resetFilters}
			 style="line-height:80%;font-size:90%">Clear selection</Button>
   	   </Row>
	  </Col>
	  <Col>
	    <Row>
	      <Col>
		    <Row> 
		       <FltMList id="proto" type="htoggle" width="25rem" data={dtaProto} filter={getFilterSet} onApply={applyFilter} updateFilter />
		    </Row>
			<Row>  
		       <FltMList id="dset" height="10rem" width="25rem" data={dtaDset} filter={getFilterSet} onApply={applyFilter} updateFilter />
		    </Row>
		  </Col>
		</Row>
 		<Row className="d-flex justify-content-center flex-nowrap">
			 <Col className="justify-content-end pr-1">
             <FltMList id="dx" width="13rem" data={dtaDx} filter={getFilterSet} onApply={applyFilter} updateFilter sort /> 
		   </Col>
		   <Col className="justify-content-begin ml-0 pl-0">
              <FltMList id="reg" width="14rem" height="8.1rem" data={dtaReg} filter={getFilterSet} onApply={applyFilter} updateFilter sort />
		   </Col>
        </Row>
	  </Col>
	  <Col >
	  <Row className="d-flex justify-content-begin">
		    <div className="float-left">
  			<RSelSummary />
			</div>
         </Row>
	  </Col>
	</Row>
  </div>);
}

export default RnaSelect;
