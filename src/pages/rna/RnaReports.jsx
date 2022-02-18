//const $ = require('jquery')
import { h, render } from 'preact';
import {useEffect, useState} from "preact/hooks";
import './style.css';
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label} from 'reactstrap';
import axios from 'axios'
import useSWR from 'swr'
//$.DataTable = require('datatables.net');

const fetcher = url => axios.get(url).then(res => res.data)
const opts = { revalidateOnFocus:false }

function arrShow(c) {
	return Array.isArray(c) ? c.map( (e, i) => (i ? <span><br />{e}</span> : <>{e}</>  ))  
		   : c 
}
/*
const TableDSets = ( props ) => {
	const urls=[null, '/pgdb/dsets', '/pgdb/dx'];
	let tnum=parseInt(props.tnum);
	if (!tnum || tnum>=urls.length) tnum=0;
	const { data, error } = useSWR( (tnum ? urls[tnum] : null), 
		    fetcher, opts)
	if (tnum===0) return null;
    if (error) return <div><h4> Failed to load! </h4></div>
	if (!data) return <div><h4> loading table.. </h4></div>
	// render the table here
	// header is the first 
	return (<table className="tbl tbldsets"><thead>
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
}


function DTable( props ) {
	const columns = [
		{
			title: 'Name',
			width: 120,
			data: 'name'
		},
		{
			title: 'Nickname',
			width: 180,
			data: 'nickname'
		},
	];

	function shouldComponentUpdate(nextProps) {
		if (nextProps.names.length !== this.props.names.length) {
			reloadTableData(nextProps.names);
		} else {
			updateTable(nextProps.names);
		}
		return false;
	}

	function updateTable(names) {
		const table = $('.dt-wrapper')
					  .find('table')
					  .DataTable();
		let dataChanged = false;
		table.rows().every(function () {
			const oldNameData = this.data();
			const newNameData = names.find((nameData) => {
				return nameData.name === oldNameData.name;
			});
			if (oldNameData.nickname !== newNameData.nickname) {
				dataChanged = true;
				this.data(newNameData);
			}
			return true; // RCA esLint configuration wants us to 
						 // return something
		});
	
		if (dataChanged) {
			table.draw();
		}
	}
	function reloadTableData(names) {
		const table = $('.dt-wrapper')
					  .find('table')
					  .DataTable();
		table.clear();
		table.rows.add(names);
		table.draw();
	}
	useEffect(()=> {
		$(this.refs.main).DataTable({
			dom: '<"dt-wrapper"t>',
			data: this.props.names,
			columns,
			ordering: false
		 });
		//cleanup function:
		return () => { $('.dt-wrapper')
		  .find('table')
		  .DataTable()
		  .destroy(true);
	   }
	})
  
   return ( <div className=".dt-wrapper">
         <table ref="main"> 
		 </table>
   </div>)

}
*/
const RnaReports = ({ style }) => {
	const [tbl, setTable]=useState(0); // 0 = no table being shown or requested
    function onBtnClick(e) {
        const id=e.target.id;
		switch (id) {
			case "b1": setTable(1);
			           break;
			default: 
		}
		
		
	   }
	
	return (<div style={style}>
	 <Row />
	 <Row className="pt-2"> <Button id="b1" style="line-height:90%" onClick={onBtnClick}>Datasets</Button> </Row>
	 <Row className="justify-content-center mx-auto p-1">
	{/*	 <Col className="col-auto"><TableDSets tnum={tbl} /></Col> */}
	</Row>
	</div>);
}

export default RnaReports;
