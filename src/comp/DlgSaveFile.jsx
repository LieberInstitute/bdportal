import { DlgModal } from './DlgModal';
import {useState} from "preact/hooks";
import {saveFile} from "./gutils";

import {DropdownMenu, DropdownToggle, DropdownItem, UncontrolledDropdown,
	Row, Col, Input, Button, Label} from 'reactstrap';

 // props.fdata has the data to be saved
export function DlgSaveFile( props ) { //props.hide() must exist
  // data payload must be in props.fdata
  // props.fext has the file extension (default: "csv")
  // propt.mimeType can be provided unless text/plain
  if (! props.hide ) 
   throw new Error('DlgSaveFile: props.hide must exist!')
  
  const [fileName, setFileName] = useState('');
  
  function fnameChange( {target}) { setFileName(target.value); }

  function onSave() {
        if (props.fdata) {
            let fdata=props.fdata
            if (typeof props.fdata == 'function')
              fdata = props.fdata()

            let fext=props.fext;
            if (!fext) fext='csv';
            let fname=`${fileName}.${fext}`
            console.log(`fdata found.. Saving file ${fname}..`)
            saveFile(fdata,  fname, props.mimeType)
        } else {
              console.log("props: ", props)
        }
        props.hide();
  }

  return (<DlgModal { ...props} title="Save file" >
        <Row className="form-group d-flex justify-content-center flex-nowrap">
           <Col xs="6" className="d-flex justify-content-end mr-0 pr-2"> 
              <Label className="pt-2 float-right">Please enter file name:</Label> </Col>
           <Col xs="6" className="ml-0 pl-0 d-flex justify-content-start"> 
           <Input id="fname" onChange={fnameChange} placeholder="Enter file name here" />
           </Col>
        </Row>
        <Row className="d-flex w-100 flex-nowrap justify-content-center">
           <Col className="d-flex justify-content-center">  
             <Button className="btn btn-light" onClick={onSave} disabled={fileName.length===0}>Save</Button>

             <div style="width:3rem" />
             <Button className="btn btn-light" 
                 style="line-height:80%;font-size:80%" 
                 onClick={props.hide}>Cancel</Button>
           </Col>
        </Row>
  </DlgModal>
)
}
