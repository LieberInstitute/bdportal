import $ from 'jquery';
import { h, render } from 'preact';
import {useEffect, useState} from "preact/hooks";
import {APP_BASE_URL} from '../../appcfg'
import './style.css'
import {Row, Col, Button, Label, Input, CustomInput, Nav, NavItem, NavLink} from 'reactstrap'


function BrRegSeq(props) {
	  const [rows, setRows]=useState([])
 //
 //const [datasrc, setDataSrc] = useState(APP_BASE_URL+'data/multi_dta.json.gz');
	async function fetchData(url) {
		const res =  await fetch(url, { mode: 'cors'})
		const ctype=res.headers.get('Content-Type')
		//console.log("url=",url," content type : ", ctype)
		//if (ctype=="application/json") {
		//		return JSON.parse(await jres.text());
		//}
		return (await res.text());
		//console.log("  str=", str)
		//return JSON.parse(str);
	}
	function buildTable() {
      if (rows.length==0) return null;
		  //	console.log(" -----  building table for rows=", rows)
			return <table class="tbl tbldsets bregtbl">
				<thead>
					<tr>
						{ rows[0].map( (e,i)=>
              <th key={i}>{e}</th>
						)}
					</tr>
				</thead>
				<tbody>
        { rows.slice(1).map( (r,i)=>
            <tr key={i}>
						{ r.map((c,j)=>
                 <td key={j}>{c==0 && j>=5 ?'-':c}</td>
							)}
						</tr>
				 )}
			  </tbody></table>
	}

  function parseData(fdata) {
    //const decoder = new TextDecoder('utf-8')
    //const fcsv = decoder.decode(result.value) // the csv text
    let lines = fdata.trim().split(/[\n\r]+/)
    const drows = lines.map( (e)=>{
       let row=e.split(/,/)
       row.splice(12,1)
       row.splice(5,1)
       return row
       }) // array of objects
    console.log(" -- parsed drows len", drows.length)
    return drows
  }

  useEffect( () => {
   console.log(" --- BrRegSeq creation time --")
	 //const script = document.createElement("script");
	 //script.src = "/json_plotly_ageplot.js";
	 //script.async = true;
	 //document.body.appendChild(script);
  fetchData(APP_BASE_URL+'br_reg_crosstab.csv')
    .then(  res => {
        console.log("..fetching table data");
        setRows(parseData(res));
        } )
    .catch(error => console.log(error))

  }, [])

			useEffect(  ()=>{
				// resize the header and body columns to align
				/*
				const table = $('.bregtbl'),
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
       /*
			 async function getData() {
					const response = await fetch('/br_reg_crosstab.csv')
					const reader = response.body.getReader()
					const result = await reader.read() // raw array
					const decoder = new TextDecoder('utf-8')
					const fcsv = decoder.decode(result.value) // the csv text
					let lines = fcsv.trim().split(/[\n\r]+/)
					const rows = lines.map( (e)=>{
             const row=e.split(/\,/)
						 return row
					   }) // array of objects
				  console.log(" rows len", rows.length)
					setRows(rows)
				}
				getData()
		},[]) */
		console.log("~~~~~~~~~~~~ Rendering with rows len:", rows.length)
		return(<>
			<Row className="d-flex flex-nowrap flex-fill">
				<Col xs="12" className="d-flex flex-column">
				<Row className="d-flex flex-row justify-content-start p-0">
						<Col xs="6" className="d-flex justify-content-start align-content-start pt-2 pr-0">
						 <Label>Per Brain RNA-seq sample count by region</Label></Col>
					 </Row>
				<Row className="fixbregtbl">
					<Col>
				  {buildTable()}
					</Col>
				</Row>
				</Col>
			</Row>
		</>
		)
	}

	function DatasetReport(props) {
		useEffect( () => {
			console.log(" --- ExpBoxPlots creation time --")
			  //const script = document.createElement("script");
				//script.src = "/json_plotly_boxplots.js";
				//script.async = true;
				//document.body.appendChild(script);
	 },[])
	 return(<>
			<Row className="d-flex flex-nowrap flex-fill">
				<Col xs="12" className="d-flex flex-column">
				<Row className="d-flex flex-row justify-content-start p-3 pl-0">
						<Col xs="5" className="d-flex justify-content-end align-content-start pt-2 pr-0">
						 <Label>Dataset demographics and region report </Label></Col>
						<Col xs="6" className="d-flex justify-content-start align-content-center">

					 </Col>
					 </Row>
				<Row className="d-flex flex-fill">
				 <div id="plot1" class="w-100 align-self-stretch plotly-graph-div"> </div>
				</Row>
				</Col>
			</Row>
		</>)
	}


	const RnaReports = ({ style }) => {
		const [nav, setNav]=useState(1)
  	function clickNav(e) {
  		setNav(Number(e.target.id))
	  }
	 return(<div class="col-12 d-flex flex-nowrap flex-column">
	 <Row className="flex-grow-1 pt-1 mt-1 justify-content-start">
		<Col xs="1" className="d-flex p-0 m-0 colExpNav justify-content-start" >
			 <Nav vertical tabs>
			 <NavItem>
					<NavLink className="app-navlnk" id="1" active={nav==1} onClick={clickNav} href="#">Brain Region Reports</NavLink>
			 </NavItem>
			 <NavItem>
					<NavLink className="app-navlnk" id="2" active={nav==2} onClick={clickNav} href="#">Dataset reports</NavLink>
			 </NavItem>
			 <NavItem>
				 <NavLink className="app-navlnk">more to come..</NavLink>
			 </NavItem>
			</Nav>
		</Col>
		<Col xs="10" className="d-flex flex-fill">
						{(nav==1) ? <BrRegSeq /> : <DatasetReport /> }
		</Col>
		</Row>
		</div>)}






export default RnaReports;
