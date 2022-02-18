//const $ = require('jquery')
import $ from 'jquery';
import { h } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label} from 'reactstrap';
import axios from 'axios'
import {rGlobs, changeXType, RDataProvider, FltCtxProvider, dtaNames, dtFilters, 
	useFltCtx, dtaBrains, dtaBrIdx, br2Smp, useFltCtxUpdate, 
	useRData, clearFilters} from '../../comp/RDataCtx';

import useSWR from 'swr'

const fetcher = url => axios.get(url).then(res => res.data)
const opts = { revalidateOnFocus:false }

function arrShow(c) {
	return Array.isArray(c) ? c.map( (e, i) => (i ? <span><br />{e}</span> : <>{e}</>  ))  
		   : c 
}

const columns=['#','Bint', 'Dx', 'Anc.', 'Sex', 'Age', 'Dropped', 'RnaSeq', 'DNAm', 'WGS' ];

function getBrTblRow(rd, brix) {
	const [brint, dxix, raix, six, age, dropped]=rd;
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
  
	return(<tr key={brix}>
		<td>{brix}.</td>
		<td>Br{brint}</td>
		<td>{dtaNames.dx[dxix]}</td>
		<td>{dtaNames.race[raix]}</td>
		<td>{dtaNames.sex[six]}</td>
		<td>{age}</td>
		<td>{dropped ? 'dropped' : ''}</td>
		<td>{numrs}</td>
		<td>{numds}</td>
		<td>{numws}</td>
	</tr>)
  }
  
const BrTable = ( props ) => {
	const urls=[null, '/pgdb/brtable', '/pgdb/brseq'];
	//let tnum=parseInt(props.tnum);
	//if (!tnum || tnum>=urls.length) tnum=0;
	//const { data, error } = useSWR( (tnum ? urls[tnum] : null), 
	//	    fetcher, opts)
	//if (tnum===0) return null;
    //if (error) return <div><h4> Failed to load! </h4></div>
	//if (!data) return <div><h4> loading table.. </h4></div>
	// render the table here
	// header is the first row
	/*
	return (<table class="tbl tbldsets"><thead>
		<tr key="t0">
        { data[0].map( (c,j)=> <td key={j}>{c}</td> ) }
		</tr>
		</thead><tbody>
	    { data.slice(1).map( (r, i) => {
         return (<tr key={i}>
          { r.map( (c,j) => <td key={j}> {arrShow(c)} 
		  
		  </td> ) 
		  }
		 </tr>)
	   }) }
    </tbody></table>);
	*/
	return (<table className="tbl tbldsets"><thead>
		<tr key="t0">
        { //dtaBrains[0].map( (b,i)=> <td key={j}>{c}</td> ) 
		  columns.map(  (e,i)=> <td key={i}>{e}</td>)
		}
		</tr>
		</thead><tbody>
	    { dtaBrains.slice(1).map( (r, i) => {
		 let brix=i+1;
         return getBrTblRow(r, brix);
	   }) }
    </tbody></table>);
}

// Note: `user` comes from the URL, courtesy of our router
const BrBrowse = ( ) => {
    /*
 	useEffect(() => {
		let timer = setInterval(() => setTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
*/
const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
    function onBtnClick(e) {
        const id=e.target.id;
		switch (id) {
			case "b1": setTable(1);
			           break;
			default: 
		}
		
		
	   }
	
	return (<div>
	 <Row />
	 <Row className="pt-2"> <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Brain table</Button> </Row>
	 <Row className="justify-content-center mx-auto p-1 vh-100 overflow-auto rowfh" >
		 <Col className="col-auto"><BrTable tnum={tbl} /></Col></Row>
	</div>);
}

export default BrBrowse;
