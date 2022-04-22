import {DlgModal } from './DlgModal';
import {useState} from "preact/hooks";
import {saveFile} from "./gutils";

import {Row, Col, Input, Button, Label} from 'reactstrap';

 // props.data has the data to be saved
export function DlgSaveFile( props ) { //props.hide() must exist
  // data payload must be in props.data
  //       which can also be a function to retrieve the data
  // props.fext has the file extension (default: "csv")
  // propt.mimeType can be provided unless text/plain

  const [fileName, setFileName] = useState('');

  function fnameChange( {target}) { setFileName(target.value); }

  function onSave() {
        if (props.data) {
            let fdata=props.data
            if (typeof props.data == 'function')
              fdata = props.data()

            let fext=props.fext;
            if (!fext) fext='csv';
            let fname=`${fileName}.${fext}`
            //console.log(`data found.. Saving file ${fname}..`)
            saveFile(fdata,  fname, props.mimeType)
        }
  }

  function fnameGiven() { return (fileName.length>0) }
  return (<DlgModal { ...props} title="Save file" button="Save"
                  buttonAction={onSave} buttonEnable={fnameGiven} buttonClose="Cancel">
        <Row className="form-group d-flex justify-content-center flex-nowrap">
           <Col xs="6" className="d-flex justify-content-end mr-0 pr-2">
              <Label className="pt-2 float-right">Please enter file name:</Label> </Col>
           <Col xs="6" className="ml-0 pl-0 d-flex justify-content-start">
           <Input id="fname" onChange={fnameChange} placeholder="Enter file name here" />
           </Col>
        </Row>
  </DlgModal>)
}