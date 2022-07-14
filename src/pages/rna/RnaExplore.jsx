import $ from 'jquery';
import {useEffect, useState} from "preact/hooks";
import {APP_BASE_URL} from '../../appcfg'
import './style.css';
import {Row, Col, Button, Label, Input, CustomInput, Nav, NavItem, NavLink} from 'reactstrap'
// Note: `user` comes from the URL, courtesy of our router
import {subjXTable, getRegionCounts, getSelDatasets, getSelSampleData, dtBrXsel } from '../../comp/RDataCtx';
function ExpAgePlots(props) {
  useEffect( () => {
     //console.log(" --- ExpAgePlots creation time --")
		   const script = document.createElement("script");
       script.src = APP_BASE_URL+"json_plotly_ageplot.js";
       script.async = true;
       document.body.appendChild(script);
	},[])
	// style="width: 100%; height: 100%;"
	return(<>
		<Row className="d-flex flex-nowrap flex-fill">
			<Col xs="12" className="d-flex flex-column">
			<Row className="d-flex flex-row justify-content-start p-3">
          <Col xs="1" className="d-flex justify-content-start align-content-start pt-2 pr-0">
            <b>[Preview]</b>
          </Col>
				  <Col xs="2" className="d-flex justify-content-end align-content-start pt-2 pr-0">
           <Label> Genes to plot:</Label></Col>
					<Col xs="8" className="d-flex justify-content-start align-content-center">
					   <Input value="GRIN2A,GRIN2B,SP4" disabled />
				 </Col>
				 </Row>
	    <Row className="d-flex flex-fill">
       <div id="plot1" class="w-100 align-self-stretch plotly-graph-div"> </div>
		  </Row>
			</Col>
		</Row>
	</>
	)
}

function ExpBoxPlots(props) {
  useEffect( () => {
		console.log(" --- ExpBoxPlots creation time --")
		 const script = document.createElement("script");
			script.src =  APP_BASE_URL+"json_plotly_boxplots.js";
			script.async = true;
			document.body.appendChild(script);
 },[])
 return(<>
		<Row className="d-flex flex-nowrap flex-fill">
			<Col xs="12" className="d-flex flex-column">
			<Row className="d-flex flex-row justify-content-start p-3 pl-0">
          <Col xs="1" className="d-flex justify-content-start align-content-start pt-2 pr-0">
            <b>[Preview]</b>
          </Col>
				  <Col xs="5" className="d-flex justify-content-end align-content-start pt-2 pr-0">
					 <Label>Control vs SCZD for gene <b>GPR52</b> across datasets: </Label></Col>
					<Col xs="6" className="d-flex justify-content-start align-content-center">
					   <Input value="Caudate, DG, DLPFC.polyA, DLPFC, Habenula, mPFC" disabled />
				 </Col>
				 </Row>
	    <Row className="d-flex flex-fill">
       <div id="plot1" class="w-100 align-self-stretch plotly-graph-div"> </div>
		  </Row>
			</Col>
		</Row>
	</>)
}


const RnaExplore = ({ selData, style }) => {
	const [nav, setNav]=useState(1)
    /*
 	useEffect(() => {
		let timer = setInterval(() => setTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
*/
function clickNav(e) {
	setNav(Number(e.target.id))
}

const smpData=getSelSampleData();
const numsmp=smpData.samples.length;
const numbr=dtBrXsel.size;
const nRegions= getRegionCounts();

return(<div class="col-12 d-flex flex-nowrap flex-column">
<Row className="flex-grow-1 flex-row pt-1 mt-1 justify-content-start flex-nowrap">
  <Col className="d-flex p-0 m-0 colExpNav justify-content-start" >
		 <Nav vertical tabs>
		 <NavItem>
        <NavLink className="app-navlnk" id="1" active={nav==1} onClick={clickNav} href="#">Age Plots</NavLink>
     </NavItem>
     <NavItem>
        <NavLink className="app-navlnk" id="2" active={nav==2} onClick={clickNav} href="#">Box Plots</NavLink>
     </NavItem>
		</Nav>
  </Col>
  <Col className="d-flex flex-fill">
  	<Row className="d-flex" >
			<Col>
			 <b>{numsmp}</b> samples from <b>{numbr}</b> subjects.
			</Col>
	 </Row>
	 <Row className="d-flex" >
          {(nav==1) ? <ExpAgePlots /> : <ExpBoxPlots /> }
   </Row>
	</Col>
	</Row>
	</div>)}

export default RnaExplore;
