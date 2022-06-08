import $ from "jquery";
import './ui.css'
import {useState} from "preact/hooks"
import {Row, Col, Button, Label, Input, Alert} from 'reactstrap'
import { DlgModal } from './DlgModal';

// onSubmit callback is called with an array (brlist) as the only parameter
// with a single parameter which is the curated array of BrNums
export function DlgBrUpload( props ) {

  let fileReader;
  let brList=[] //parsed from file upload only!
  const [alertMsg, setAlertMsg]=useState("")
  const [alertVisible, setAlertVisible] = useState(false);
  function onAlertDismiss() { setAlertVisible(false) }

  function showAlert(msg, sec) {
     if (!msg) msg = "No valid BrNum entries found."
     setAlertVisible(true)
     setAlertMsg(msg)
     if (!sec) sec=5;
     setTimeout( ()=>{ setAlertVisible(false) }, sec*1000 )
  }

  function parseBrNums(txt) {
    let lines=txt.trim().split(/\r?\n/);
    brList.length=0;
    if (lines) {
       for (let i=0;i<lines.length;i++) {
         let br=lines[i].match(/\b(Br\d+)\b/g)
         if (br && br.length) brList.push(...br)
       }
    }
  }

  function handleFileRead(e) {
      const content = fileReader.result;
      //console.log(content);
      //parse the list as it can be a larger csv with more columns and a header
      parseBrNums(content)
      let textlst=""
      if (brList.length) {
         textlst=brList.join("\n")
         $('#brlst').val(textlst)
         $('#brlst').prop('disabled', true);
      } else {
        showAlert()
      }
  }

  function handleFileChosen(file) {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);

    //parse here, on Brnum per line
  }
   //should also show an edit box where a brlist can be pasted
   //and and file upload button
   function checkListValid( ) {
     return brList.length>0;
   }

   function onSubmit( ) {
     if (brList.length==0) {
       let s=$('#brlst').val()
       if (s.trim().length==0) {
          showAlert("List is empty!")
          return false
       }
       parseBrNums(s)
       if (brList.length==0) {
         showAlert()
         return false
       }
     }
     if (props.onSubmit) props.onSubmit(brList)
     return true
   }

   return (
    <DlgModal {... props} title="BrNum list" button="Apply list" buttonClose="Cancel"
         onSubmit={onSubmit}>
      <Row className="d-flex m-0 p-0 justify-content-center align-items-center" style="min-height:52px;">
       {alertVisible && <Alert id="alInvalid" className="mb-0" color="danger" isOpen={alertVisible}
          toggle={ onAlertDismiss } style="font-size:90%">
           {alertMsg}
       </Alert>}
      </Row>
      <Row className="p-1 d-flex justify-content-start align-items-center">
        <label for="fupload"  className="app-file-upload app-btn">  <input type="file" id="fupload" accept=".csv,.txt,.tsv"
             onChange={e => handleFileChosen(e.target.files[0])} /> Upload Br list
        </label>
      </Row>
      <Row className="mb-4 pb-4">
       <Input id="brlst" type="textarea" rows="5" />
     </Row>
   </DlgModal> )

}
