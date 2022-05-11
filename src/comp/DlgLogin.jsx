import $ from 'jquery';
import { DlgModal } from './DlgModal';
import {useState, useEffect, useRef, useReducer} from "preact/hooks";

import {Row, Col, Input} from 'reactstrap';

 // props.checkLogin is a function taking (user, pass) 
 //  returning true if login succeeded, false otherwise
export function DlgLogin( props ) { 
    const [, forceUpdate] = useReducer(x => x + 1, 0); // simple forceUpdate() trick
    //const [checking, setChecking] = useState(false)
    //persistent variables across renders
    const refData = useRef({ //keep track of previous states and flags
         wasSubmitted:false, //submit button was pressed
         wasInvalid:false, // submitted and invalid
         uname_fld:'', //username typed into the input field
         prevUser:'' // last user login (submit) attempt
       })
    const m=refData.current 

    const btnlabel = props.button ? props.button : "Log in"
    const checkLogin = props.checkLogin ? props.checkLogin : ()=>true
    
    function unameChange( {target}) {
        //setUsernameField(target.value)
        const plen=m.uname_fld.length
        m.uname_fld=target.value.trim()
        const nlen=m.uname_fld.length
        let doUpdate=0
        if ((plen===0 && nlen>0) || 
            (plen>0 && nlen===0)) doUpdate++
        if (m.wasInvalid) {
                m.wasInvalid=false
                doUpdate++
        }
        if (doUpdate) forceUpdate()
    }
    function inputChange( {target}) {
        if (m.wasInvalid) {
            m.wasInvalid=false
            $(target).parents().find("#invalid").hide()
        }
    }

    function handleEnter(e) {
      if (e.key.toLowerCase() === "enter") {
        const form = e.target.form;
        const index = [...form].indexOf(e.target);
        form.elements[index + 1].focus();
        e.preventDefault();
      }
     }
  
    function loginEnable() {
        return (m.uname_fld.length>0)
    }

    function checkingState(show) {
      //const modal=$('#login-spinner').parents(".modal")
      if (show) {
         $('#login-spinner').addClass('spinner-border')  
         const bsubmit = $(".modal-content").find(":button");
         if (bsubmit) bsubmit.prop("disabled", true)
      } else {
        $('#login-spinner').removeClass('spinner-border')
        const bsubmit = $(".modal-content").find(":button");
        if (bsubmit) bsubmit.prop("disabled", false)
      }
    }

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

    function toggleDialog(e) { // just close/cancel, not submit
        m.wasInvalid=false 
        m.uname_fld=''
        props.toggle(e) //the parent will update state to close the dialog
    }

   useEffect( () => {
       if (m.wasInvalid) {
        $(".modal-body").find("#invalid").show()
       }
   })
    const dlgOpen= props.isOpen || (m.wasSubmitted && m.wasInvalid)
    m.wasSubmitted=false //clear this before every render
    return (
        <DlgModal title={props.title} isOpen={dlgOpen} toggle={toggleDialog} onSubmit={submitHandler} 
          button={btnlabel} buttonEnable={loginEnable} invalid={m.wasInvalid} >
        <Row className="d-flex form-group align-items-center justify-content-center" style="height:1.4em;"> 
             <span>&nbsp;</span>{ m.wasInvalid && <span id="invalid" style="color:red">Invalid login !</span> } 
             <div id="login-spinner" className="text-danger" role="status">
               &nbsp;
             </div>
             <span>&nbsp;</span>
        </Row>
        <Row className="d-flex form-group align-items-center">
           <Col xs="4" className="d-flex justify-content-end">
             <span>Username: </span>
           </Col>
           <Col xs="6" className="d-flex justify-content-start p-2">
             <Input type="text" name="username" onChange={unameChange}
               onKeyDown={handleEnter} />
           </Col>
        </Row>
        <Row className="d-flex form-group align-items-center">
           <Col xs="4" className="d-flex justify-content-end">
             <span>Password: </span>
           </Col>
           <Col xs="6" className="d-flex justify-content-start p-2" >
             <Input type="password" name="password" onChange={inputChange} />
           </Col>
        </Row>     
        <Row className="w-100 d-flex align-items-center" style="height:1.4em;" /> 
       </DlgModal>  
     )

}