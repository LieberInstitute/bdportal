import $ from 'jquery';
//NOTE that this assumed bootstrap CSS defs are already imported :
//import 'bootstrap/dist/js/bootstrap.bundle.min';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Container, Row, Col, Button, Modal,
  ModalHeader, ModalBody, ModalFooter, Form, FormGroup} from 'reactstrap'

//import { createPortal } from 'preact/compat';
//import Close from "../assets/close.svg";
import { useState, useRef, useEffect } from "preact/hooks";
import './DlgModal.css';
/*
   Modal dialog handler wrapping Bootstrap/Reactstrap Modal component
    Props:
       toggle : callback for toggling the isOpen value (state)
       isOpen : boolean value to control visibility (usually controlled by toggle())
       title : the title to show at the top of the dialog
       buttonClose : caption of the default close/cancel button (default: "Close")
       button : add a submit button with this caption
       buttonAction : callback onClick handler for the added button;
                      this is called BEFORE the onSubmit callback
       buttonEnable : callback - when present, should return true/false in order
                      to enable/disable the added submit button
       onSubmit : callback when a "submit" button was clicked;
                  must be a function returning a boolean;
                  when returning false, the dialog will NOT close!

*/
export function DlgModal ( props ) {
  if (! (props.toggle && typeof(props.toggle)==='function') )
    throw new Error('DlgModal: props.toggle function must be provided !')
 const title=props.title ? props.title : " "
 const btnClose=props.buttonClose ? props.buttonClose : "Close"

 //boolean function that can be used to control enabling of the submit button
 if (!props.buttonEnable) props.buttonEnable=()=>true

 async function dlgSubmit(e) {
   let doclose=true
   e.preventDefault();
   if (props.onSubmit && typeof(props.onSubmit) === 'function' ) {
     doclose=await props.onSubmit(e);
   }
   if (doclose) props.toggle()
 }
  //auto focus on the first input field!
 useEffect(()=>{
  const tinput = $(".modal-body").find("input[type='text']:enabled:visible:first");
  if (tinput) tinput.focus()
 })
 //  <ModalHeader toggle={props.toggle}>{title}</ModalHeader>
 return (<Modal focus={true} fade={false} backdrop="static"
                isOpen={props.isOpen} toggle={props.toggle}>
     <div className="modal-header">
        <h5 className="modal-title">{title}</h5>
        <div type="button" tabindex="-1" className="close" data-dismiss="modal"
          aria-label="Close" onClick={props.toggle}>
          <span aria-hidden="true">&times;</span>
        </div>
      </div>
    <Form onSubmit={dlgSubmit}>
    <ModalBody><Container fluid={true}>
      <FormGroup>
       {props.children}
      </FormGroup>
     </Container>
   </ModalBody>
   <ModalFooter className="justify-content-center">
     <Row className="d-flex w-75 justify-content-around">
   { props.button && <Button type="submit" color="primary" disabled={!props.buttonEnable()}
        onClick={ (e) => {
         if (props.buttonAction) props.buttonAction(e)
         //closing the dialog managed by onSubmit(e) result
     } }>
     {props.button}
    </Button>
   }
    <Button color="secondary" onClick={props.toggle}>
       {btnClose}
    </Button>
    </Row>
   </ModalFooter>
   </Form>
  </Modal> )

}