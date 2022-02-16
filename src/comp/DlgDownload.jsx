import { DlgModal } from './DlgModal';
import {useState} from "preact/hooks";
import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label} from 'reactstrap';
   import axios from 'axios';
export function DlgDownload( props ) {
  const fNames=['Gene', 'Transcript', 'Exon', 'Junction'];

  //const fetcher = params => url => post(url, params)
  //props.payload should have the sample list
  //const smplist=props.data;
  //if (!smplist) smplist=null;
  let url='/pgdb/save_rse_gene'
  /*  
  
  const fetcher = (...args) => fetch(url, {
   method: 'post',
   headers: {
     "Content-Type": "application/json"
   },
   body: JSON.stringify(props.payload)
    }).then(res => res.json())
  
  const { data, error } = useSWR(url, fetcher, { suspense: true })
  */

  const [status, setStatus] = useState('');

  function downloadRSE(rse_type, fname) {
   axios({
      method: 'post',
      url: '/user',
      timeout: 80000, // wait 80 seconds
      data: props.payload  //data MUST be in props.payload  (sample list)
    })
    .then( (res) => {
          console.log(res);
    })
    .catch((error) => {
        console.log(error);
    });

  }
 

  return (<DlgModal { ...props} title="Download data" justClose="1" >
        <div className="row form-group">
           <div className="col-4 align-self-center">  </div>
           <div className="col-4 align-self-center"> Feature type   </div>        
        </div>
        { fNames.map( (it, i) => 
           <div className="row form-group">
              <div className="col-4 align-self-center">  </div>
              <div className="col-4 align-self-center">{it} RSE </div>
              <div className="col-4 align-self-center"> <button className="btn btn-primary">Download</button> </div>
           </div>
         )}
         <br />
  </DlgModal>
)
}
