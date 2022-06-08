import {DlgModal } from './DlgModal';
import {useState} from "preact/hooks";
import {saveFile, rowCSV, rowTSV} from "./gutils";

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

  function fnameChange( {target}) { setFileName(target.value); }
  function onFmtChange(e) {
    setFmt((e.target.id=="r1")?1:2)
  }

  function onSave() {
        if (props.data) {
            let arrdata=props.data
            if (typeof props.data == 'function')
              arrdata = props.data()
            const fext=(fmt==1)?"csv":"tsv"
            let fname=`${fileName}.${fext}`
            let fdata=""
            if (fmt==1) arrdata.forEach( row => fdata+=rowCSV(row) )
              else arrdata.forEach( row => fdata+=rowTSV(row) )
            saveFile(fdata,  fname, props.mimeType)
        }
  }

  function fnameGiven() { return (fileName.length>0) }
  return (<DlgModal { ...props} title="Save text file" button="Save"
                  buttonAction={onSave} buttonEnable={fnameGiven} buttonClose="Cancel">
         <Row className="form-group pt-2 mt-2 d-flex justify-content-center flex-nowrap">
           <Col xs="5" className="d-flex justify-content-end mr-0 pr-2">
              <Label className="pt-2 float-right">Please enter file name:</Label>
           </Col>
           <Col xs="7" className="ml-0 pl-0 d-flex justify-content-start">
             <Input id="fname" onChange={fnameChange} placeholder="file name (without extension)" />
           </Col>
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