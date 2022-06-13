import $ from 'jquery';
import { DlgModal } from './DlgModal';
import {useState, useRef} from "preact/hooks";
import {Row, Col, Input, Button, Label, FormGroup, } from 'reactstrap';
import axios from 'axios';

const fNames=['gene', 'tx', 'ex', 'jx'];

function f2Name(str) {
  switch (str) {
    case 'ex': str='exon';break;
    case 'tx': str='transcript';break;
    case 'jx': str='junction';break;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function MxDlButton (props) { //TODO

  function dlClick() {
    //TODO: 
  }
  const [fstatus, setFStatus]=useState(0)
  return( <div>
    <Label style="position:relative;padding-right:4px;text-align:right;top:3px;width:13rem;"
         className={  fstatus ? "blink-anim" : null }> <b>{ fstatus ? "..." : " " }</b> </Label>
   <Button id="bsave" className="btn-sm app-btn" disabled={fstatus!==0} onClick={dlClick}>Download</Button>
   </div>
  )
}


export function DlgDownload( props ) {
  
    let dlurl='/pgdb/adl'
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
  const [prefix, setPrefix] = useState('dataset_');
  const [fext, setFext] = useState('rda')
  const [norm, setNorm] = useState(0)

  function onFmtChange(e) {
    setFext((e.target.id=="r1")?'rda':'csv.gz')
  }
  function onNormChange(e) {
    setNorm((e.target.id=="n0")? 0:1)
  }

  function downloadRSE(rse_type, fname) {
   axios({ method: 'post',
      url: '/user',  timeout: 80000, // wait 80 seconds
      data: props.payload  //data MUST be in props.payload  (sample list)
    })
    .then( (res) => { console.log(res) })
    .catch((error) => { console.log(error) })
  }

 
  function prefixChange( {target}) { setPrefix(target.value); }

  return (<DlgModal { ...props} title="Download data" justClose="1" width="50em">
    <Row className="form-group d-flex justify-content-center flex-nowrap mb-0 pb-0" style="font-size:90%;">
      <Col xs="3" className="d-flex justify-content-end mr-0 pr-2">
              <Label className="pt-2 float-right">File prefix:</Label>
      </Col>
      <Col xs="3" className="ml-0 pl-0 d-flex justify-content-start">
             <Input id="fpre" onChange={prefixChange} value={prefix} />
      </Col>
      <Col className="ml-0 pl-0 d-flex justify-content-start ">
        File format: &nbsp;
        <FormGroup tag="fieldset" onChange={onFmtChange}>
          <FormGroup check>
            <Label check>
              <Input type="radio" id="r1" name="fmt" checked={(fext=='rda')} /> .rda (RSE)
            </Label>
            </FormGroup>
            <FormGroup check>
            <Label check>
              <Input type="radio" id="r2" name="fmt" checked={(fext=='csv.gz')} /> .csv.gz
            </Label>
           </FormGroup>
         </FormGroup>
      </Col>
    </Row>
    <Row className="d-flex justify-content-center mt-0 pt-0" style="font-size:90%;">
       <FormGroup tag="fieldset" onChange={onNormChange}>
          <FormGroup check>
            <Label check>
              <Input type="radio" id="n0" name="norm" checked={(norm==0)} /> raw counts
            </Label>
            </FormGroup>
            <FormGroup check>
            <Label check>
              <Input type="radio" id="n1" name="norm" checked={(norm==1)} /> normalized (RPKM/TPM)
            </Label>
           </FormGroup>
         </FormGroup>
    </Row>
    <Row className="form-group pt-0 mt-0" style="font-size:90%;min-height:2em;">
      { norm ? <>
      <Col xs="4" className="pr-0 mr-0 align-self-center" style="max-width:9em;">Restrict to genes:</Col>
      <Col xs="8" className="pl-0 ml-0 mx-auto mr-0 pr-0"><Input placeholder="GRIN2A,GRIN2B,SP4" /></Col>
      </> : null }
    </Row>

     { fNames.map( (it, i) =>
           <Row key={it} className="form-group d-flex justify-content-end" style="font-size:90%;">
              <Col xs="4" key={i+1} className="align-self-center">{f2Name(it)} data</Col>
              <Col xs="4" key={i} className="align-self-center" style="color:#666;"> {`${prefix}${it}.${fext}`} </Col>
              <Col xs="3" key={i+2} className="align-self-center">
                    <Button className="btn app-btn">Download</Button> </Col>
           </Row>
         )}
  </DlgModal>
 )
}
