import $ from 'jquery';
import { DlgModal } from './DlgModal';
import {useState, useEffect, useRef, useReducer} from "preact/hooks";
import { LOGIN_SRV } from '../appcfg';
import {Row, Col, Input} from 'reactstrap';

 // props.onLogin is a function with (user, jwtoken) params
 //  called when the user successfully logged in within the iframe
 // must return true if the token was validated and the login was accepted
export function DlgRLogin( props ) {
    const [, forceUpdate] = useReducer(x => x + 1, 0); // simple forceUpdate() trick
    //const [checking, setChecking] = useState(false)
    //persistent variables across renders
    const refData = useRef({ //keep track of previous states and flags
         wasInvalid:false, // submitted and invalid
         uname_fld:'', //username typed into the input field
         prevUser:'' // last user login (submit) attempt
       })
    const m=refData.current
    if (! (props.onLogin && typeof(props.onLogin)==='function') )
       throw new Error('DlgRLogin: props.onLogin function must be provided !')
    //const btnlabel = props.button ? props.button : "Log in"

    /*function handleEnter(e) {
      if (e.key.toLowerCase() === "enter") {
        const form = e.target.form;
        const index = [...form].indexOf(e.target);
        form.elements[index + 1].focus();
        e.preventDefault();
      }
     }*/

   /*
   async function submitHandler(e) {
        m.wasSubmitted=true
        const uname=e.target.username.value.trim() //should be the same with uname_fld[0]
        const pass=e.target.password.value
        checkingState(true)
        const validLogin=await checkLogin(uname, pass)
        checkingState(false)
        if (validLogin) {
            m.wasInvalid=false
            //props.toggle(e) //let the parent close the dialog
            return(true) //let the parent close the dialog
        }
        // failed login
        m.prevUser=uname
        m.wasInvalid=true
        forceUpdate()
        return (false)
    }
    */
    function toggleDialog(e) { // just close/cancel, not submit
        m.wasInvalid=false
        m.uname_fld=''
        props.toggle(e) //the parent will update state to close the dialog
    }

    function onMessage(ev) {
      //console.log("received Message with data: ", ev.data)
      const qobj=ev.data;
      if (!qobj.tok) return;
      let v=props.onLogin(qobj.usr, qobj.tok)
      if (v) props.toggle();
    }

    function onShow() { //executed when dialog is opened
      window.addEventListener("message", onMessage )
    }

    function onClose() {
      window.removeEventListener("message", onMessage)
    }
    /* useEffect( () => {
       console.log(" ------------- useEffect executed ---- ")
       // if (m.wasInvalid) {
       // $(".modal-body").find("#invalid").show()
      // }
    }) */

    const dlgOpen= props.isOpen || (m.wasSubmitted && m.wasInvalid)
    m.wasSubmitted=false //clear this before every render
    // onSubmit={submitHandler} button={btnlabel}
    // <iframe src="http://localhost:4080/" ...
    return (
        <DlgModal title={props.title} isOpen={dlgOpen} toggle={toggleDialog} buttonClose="Cancel"
                  onShow={onShow} onClose={onClose}>
            <iframe src={LOGIN_SRV} width="460" height="220"
                    frameBorder="0" style="border:0;padding:0;margin-right:22px;" allowtransparency="true" >
            </iframe>
       </DlgModal>
     )

}