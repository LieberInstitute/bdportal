import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';
//import AgeRangeEntry from '../../comp/agerange';
import {RDataProvider, FltCtxProvider, useFltCtxUpdate, useRData, clearFilters,
   } from '../../comp/RDataCtx';

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
		clearFilters();
		setForceUpdate(!forceUpdate);
		notifyUpdate('clear');
	}
    //console.log(">> rendering RnaSelect parent with ageRangeState :", ageRangeState);
	/*
		  <AgeRangeEntry min={-1} max={110} enabled={ageRangeState[0]} vmin={ageRangeState[1]} vmax={ageRangeState[2]} onChange={ageRangeChange} />
			<br /><br />
    */
	return (<div style={style}>
  	<Row>
 	   <Col xs="3">
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
             <FltMList id="sex" type="htoggle" width="12rem"  /> 
			</div>
         </Row>
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
            <FltMList id="age" width="12rem" />
			</div>
         </Row> 
         <Row className="d-flex justify-content-end">
		    <div className="float-right">
           <FltMList id="race"  height="12rem" width="12rem" />
		   </div>
	    </Row>
		<Row className="d-flex justify-content-end pt-4 mt-3">
			 <Button outline color="danger"  onClick={resetFilters}
			 style="line-height:80%;font-size:90%">Clear selection</Button>
   	   </Row>

	  </Col>
	  <Col>
	    <Row>
	      <Col>
		    <Row> 
		       <FltMList id="proto" type="htoggle" width="24rem" />
		    </Row>
			<Row>  
		       <FltMList id="dset" height="10rem" width="24rem" />
		    </Row>
		  </Col>
		</Row>
 		<Row className="m-0 p-0 justify-content-left flex-nowrap">
			 <Col className="m-1 p-1 float-right">
             <FltMList id="dx" width="11rem" /> 
		   </Col>
		   <Col className="m-1 p-1 justify-content-left">
              <FltMList id="reg" width="11rem" />
		   </Col>
        </Row>
	  </Col>
	  <Col >
	  <Row className="d-flex justify-content-start">
		    <div className="float-left">
  			<RSelSummary />
			</div>
         </Row>
	  </Col>
	</Row>
  </div>);
}

export default RnaSelect;
