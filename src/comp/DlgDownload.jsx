import $ from 'jquery';
import { DlgModal } from './DlgModal';
import './spinners.css';
import {useState, useRef, useEffect} from "preact/hooks";
import {Row, Col, Input, Button, Label, FormGroup } from 'reactstrap';
import {buildRSE, saveRStagedFile} from './RDataCtx';
//import axios from 'axios';

const  fTypes=['gene', 'tx', 'ex', 'jx']; //feature types
const ftNames=['Gene', 'Transcript', 'Exon', 'Junction']

/* Matrix/Assay download row + control(spinner + Button)
props :
   prefix : file name (prefix)
   fext : 'rda' | 'csv.gz'
   fidx :  idx in fTypes/ftNames
   norm : 0 (counts) or 1 (rpmkm)
*/
function MxDlRow ({prefix, fidx, norm, fext, datasets, samples}) {

  const [fstatus, setFStatus]=useState(0) // 0 = nothing/ok, 1 = building, -1 = error
  const [saved, setSaved]=useState("")
  const ds0= (datasets && datasets.length)? datasets[0] : "nope"
  const numsamples =  (samples && samples.length)? samples.length : 0

  const filename = `${prefix}${fTypes[fidx]}_n${numsamples}.${fext}`

  function dlClick() {
    if (fidx>0) {
      alert(" Oops, to be implemented soon ! ")
      return
    }
    //setFStatus( v => (v<0 ? 0 : (v ? -1 : 1)) )
    if (fstatus!==0) alert(" Saving operation in progress, try later. ")
    setFStatus(1) //enter file prep state
    let dtype=norm ? 'rpkm' : 'counts'
    if (fidx==1) dtype='tpm'
    buildRSE(filename, samples, fTypes[fidx], dtype)
			 .then( res => {
				 console.log("res=", res)
				 return res.json()
			  } )
			 .then( fn => {
					// 1st row: header, 2nd row: data = filename
					let fname=""
					if (fn.length>1) fname=fn[1][0]
          console.log("fn prepared:", fname)
					if (fname) {
						 setSaved('saved.')
             setFStatus(0)
					   //simulate a link->click to download the file:
					   saveRStagedFile(fname)
					}
			 })
  }

  useEffect( ()=>{
    setSaved("")
    setFStatus(0)
  }, [prefix, fext, norm, datasets, samples])
  // Button: disabled={fstatus!==0}  ?
  let ctype=norm ? (fidx==1 ? "(TPM)": fidx==3 ? "RP10M" : "(RPKM)") : "";
  let disabled=(norm==0 && fidx==1)
  return( <Col className="m-0 p-0 pl-1" style="border-top:1px solid #ddd;">
     <Row className="form-group d-flex flex-nowrap justify-content-between mb-0 pb-0"
          style="font-size:90%;min-height:22px;">
        <Col className="pl-0" style="min-width:25rem;"><b>{ftNames[fidx]}</b> data {ctype}</Col>
        <Col className="d-flex justify-content-center m-0 p-0">
            <div class="m-0 p-0" style="position:relative">
            {(fstatus==1) ? <div style="position:relative;">
                    <div class="spinner-bars"><span></span><span></span><span></span><span></span><span></span></div>
                            </div>
             : <div class="red-info-text" style="position:relative;top:1px;">
               {(fstatus<0) ? <span style="position:relative;font-size:14px;line-height:15px;top:3px;margin-left:-6px;" > &nbsp; &nbsp;Error! </span> :
                              <span style="color:#777;position:relative;top:2px;"> {saved} </span> }
               </div>
            }
            </div>
        </Col>
     </Row>

     <Row className="form-group d-flex justify-content-between flex-nowrap mt-0 pt-0 pb-1" style="font-size:90%;">
      <Col className="pl-0 align-self-begin overflow-hidden text-nowrap"
           style="color:#666;min-width:25rem;background-color:#f4f4f4">
        {filename} </Col>
        <Col className="d-flex align-self-begin justify-content-end">
         <Row>
          <Button id="bsave" className="btn-sm app-btn" disabled={disabled} onClick={dlClick}>Export</Button>
        </Row>
      </Col>
    </Row>
   </Col>)
}


  /*
    data can be retrieved by calling props.getData():
      {
         datasets: [ ] (array of dataset names)
         samples: [  ] array of sample_ids
      }
      data should be retrieved only once when the dialog is shown the first time
  */

export function DlgDownload( props ) {

  const [prefix, setPrefix] = useState('seldata_');
  const [fext, setFext] = useState('rda')
  const [norm, setNorm] = useState(0)
  const [numsamples, setNumSamples] = useState(0)
  const [ds0, setDs0] = useState('')
  const refData=useRef( {
      datasets : null,
      samples : null
  })

  const m=refData.current;

  function afterOpen() {    
    if (props.getData)  {
      const data=props.getData()
      if (data.datasets) {
        m.datasets=data.datasets
        setDs0(m.datasets[0])
        setPrefix(`${m.datasets[0]}_`)
      }
      if (data.samples)  {
        m.samples=data.samples
        setNumSamples(m.samples.length)
      }
    }
  }

  function onFmtChange(e) {
    setFext((e.target.id=="r1")?'rda':'csv.gz')
  }
  function onNormChange(e) {
    setNorm((e.target.id=="n0")? 0:1)
  }

  function prefixChange( {target}) { setPrefix(target.value); }
  return (<DlgModal { ...props} title="Export expression data" justClose="1" onShow={afterOpen} width="50em">
    <Row className="form-group d-flex justify-content-center flex-nowrap mb-1" style="font-size:90%;">
      <Col className="d-flex justify-content-between m-0 p-0">
              <Label className="frm-label text-nowrap">File name:</Label>&nbsp;
              <Input id="fpre" className="frm-input" onChange={prefixChange} value={prefix} />
      </Col>
    </Row>
    <Row className="form-group d-flex justify-content-center flex-nowrap mt-0 pt-0 mb-0 pb-0" style="font-size:90%;">
      <Col className="d-flex-column justify-content-start ml-4 pl-4">
        <Row>Format</Row>
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
      <Col className="d-flex-column justify-content-start">
      <Row>Values</Row>
       <FormGroup tag="fieldset" onChange={onNormChange}>
          <FormGroup check>
            <Label check>
              <Input type="radio" id="n0" name="norm" checked={(norm==0)} />raw counts
            </Label>
            </FormGroup>
            <FormGroup check>
            <Label check>
              <Input type="radio" id="n1" name="norm" checked={(norm==1)} />normalized
            </Label>
           </FormGroup>
         </FormGroup>
      </Col>
    </Row>
    { norm ? <Row className="form-group d-flex justify-content-center flex-nowrap mb-2" style="font-size:90%;">
      <Col xs="3" className="p-0 m-0 align-self-begin text-nowrap" style="min-width:6.2rem;top:3px;">Restrict to genes:</Col>
      <Col className="pl-1 ml-0 mx-auto mr-0 pr-0"><Input className="frm-input" style="font-size:14px;" />
      <Label style="font-size:13px;color:#777;">e.g. GRIN2A,GRIN2B,SP4</Label>
      </Col>
      </Row> : null }
    { fTypes.map( (it, i) =>
      <MxDlRow key={i} fidx={i} norm={norm} fext={fext} prefix={prefix} datasets={m.datasets} samples={m.samples} /> )}
  </DlgModal>
 )
}
