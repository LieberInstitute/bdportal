import $ from 'jquery';
import {DlgModal } from './DlgModal';
import {useState, useRef} from "preact/hooks";
import {saveFile, rowCSV, rowTSV} from "./gutils";
import { logAction } from './RDataCtx';

import {Row, Col, Input, Button, Label, FormGroup, } from 'reactstrap';

 // props.data has the data to be saved in array of rows format
 // header must be the first row
export function DlgSaveCSV( props ) { //props.hide() must exist
  // data payload must be in props.data
  //       which can also be a function to retrieve the data
  // props.fext has the file extension (default: "csv")
  // propt.mimeType can be provided unless text/plain

  const [fileName, setFileName] = useState('');
  const [fmt, setFmt]=useState(1)
  const dlgRef=useRef()
  const refData=useRef( {
    data : null //array of rows to save as CSV/TSV
  })

  const m=refData.current;

  function fnameChange( {target}) {
    const v=target.value
    setFileName(v);
  }

  function onFmtChange(e) {
    setFmt((e.target.id=="r1")?1:2)
  }

  function afterOpen() {
    if (props.getData)  {
      m.data=props.getData() //dynamically get data, in case it was updated since dialog creation
    } else {
      m.data=props.data
    }
    if (props.fname) {
      const input=$(dlgRef.current).find('#inp_fname')
      input.val(props.fname)
      setFileName(props.fname)
    }
  }

  function onSave() {
      let arrdata=m.data
            /*
            if (typeof props.data == 'function')
              arrdata = props.data()
       */
      const fext=(fmt==1)?"csv":"tsv"
      let fname=`${fileName}.${fext}`
      let fdata=""
      if (fmt==1) arrdata.forEach( row => fdata+=rowCSV(row) )
         else arrdata.forEach( row => fdata+=rowTSV(row) )
      logAction('export', null, fdata);
      saveFile(fdata,  fname, props.mimeType)
  }
  const title=props.title || "Save table"
  function fnameGiven() { return (fileName.length>0) }
  return (<DlgModal { ...props} title={title} button="Save" onShow={afterOpen}
                  buttonAction={onSave} buttonEnable={fnameGiven} buttonClose="Cancel">
         <Row className="form-group pt-2 mt-2 d-flex flex-row justify-content-start">
           {/* <Col xs="5" className="d-flex justify-content-end mr-0 pr-2">
            <Row>
              <Label className="pt-2 float-right">Please enter file name (without extension):</Label>
            </Row>
           </Col> */}
           <Col>
            <Row className="mb-0 pb-0" >
            <Label className="frm-label text-nowrap mb-0 pb-0" style="font-size:95%;">
              Enter file name (without extension):
              </Label>
            </Row>

            {/* <Col xs="7" className="ml-0 pl-0 d-flex justify-content-start"> */}
            <Row className="pt-0 mt-0">
              <div ref={dlgRef} class="w-100">
                { props.fname ?
                  <Input id="inp_fname" className="frm-input" onChange={fnameChange} />
                  :
                  <Input id="inp_fname" className="frm-input" onChange={fnameChange} placeholder="file_name" />
                }
              </div>
            </Row>
          </Col>
           {/*</Col> */}
        </Row>
        <Row className="form-group d-flex justify-content-center flex-nowrap pb-0">
          <Col xs="5" className="d-flex justify-content-end">
           File format:
          </Col>
          <Col  xs="7" className="d-flex pb-0" >
           <FormGroup tag="fieldset" onChange={onFmtChange}>
                <FormGroup check>
                <Label check>
                  <Input type="radio" id="r1" name="fmt" checked={(fmt==1)} /> .csv
                </Label>
                </FormGroup>
                <FormGroup check>
                <Label check>
                  <Input type="radio" id="r2" name="fmt" checked={(fmt==2)} /> .tsv
                </Label>
                </FormGroup>
            </FormGroup>
           </Col>
        </Row>
  </DlgModal>)
}