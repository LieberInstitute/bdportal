import $ from "jquery";
import './ui.css'
import {useState, useRef} from "preact/hooks"
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

  const refData=useRef( {
     showInfo: true
  })

  const m=refData.current;

  function showAlert(msg, sec) {
      m.showInfo=false
     if (!msg) msg = "No valid BrNum entries found."
     setAlertVisible(true)
     setAlertMsg(msg)
     if (!sec) sec=6;
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
    m.showInfo=false
    setAlertVisible(false)
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

   function afterShow() {
      m.showInfo=false
   }

   function onClose() {
     setAlertVisible(false)
     m.showInfo=true
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
         onSubmit={onSubmit} onClose={onClose} onShow={afterShow}>
      <Row className="d-flex m-0 p-0 justify-content-center align-items-center" style="min-height:52px;">
        { m.showInfo && <span id="infoTxt" class="red-info-text text-center">Upload a text file with Br#s from your computer or type/paste
          the list of Br#s in the box below. Only <i>"Br"</i>-prefixed tokens are recognized.
          </span>
        }
       {alertVisible && <Alert id="alInvalid" className="mb-0 app-alert" color="danger" isOpen={alertVisible}
          toggle={ onAlertDismiss } style="font-size:90%">
           {alertMsg}
       </Alert>}
      </Row>
      <Row className="p-1 d-flex justify-content-start align-items-center">
        <label for="fupload"  className="app-file-upload app-btn">  <input type="file" id="fupload" accept=".csv,.txt,.tsv"
             onChange={e => handleFileChosen(e.target.files[0])} />&nbsp; Upload file
        </label>
      </Row>
      <Row className="mb-2 pb-2">
       <Input id="brlst" type="textarea" rows="5" />
     </Row>
     <Row className="pb-0 mb-0 d-flex justify-content-center align-items-center"><span id="infoTxt" class="red-info-text text-center">
     Applying a list will clear all panel selections.
     </span>
     </Row>
   </DlgModal> )

}
