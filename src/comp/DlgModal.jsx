import $ from 'jquery';
//NOTE that this assumed bootstrap CSS defs are already imported :
//import 'bootstrap/dist/js/bootstrap.bundle.min';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Container, Row, Col, Button, Modal,
  ModalHeader, ModalBody, ModalFooter, Form, FormGroup} from 'reactstrap'
import './ui.css'
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
                  must be a function returning a boolean; when false
                  then the dialog will NOT close!
       onClose   : function to be called every time the dialog is closed

       ???onShow   : function to be called every time the dialog is first shown
                 (to initialize data etc.)


*/
export function DlgModal ( props ) {
  if (! (props.toggle && typeof(props.toggle)==='function') )
    throw new Error('DlgModal: props.toggle function must be provided !')

  const refData=useRef( {
      mouseDown: false,
      pxratio: 1
    }) //keep track of mouse down state

  const mRef=useRef(null)

  const title=props.title ? props.title : " "

  const btnClose=props.buttonClose ? props.buttonClose : "Close"
  const m=refData.current
  //boolean function that can be used to control enabling of the submit button
  if (!props.buttonEnable) props.buttonEnable=()=>true

  async function dlgSubmit(e) {
    let doclose=true
    e.preventDefault();
    if (props.onSubmit && typeof(props.onSubmit) === 'function' ) {
      doclose=await props.onSubmit(e);
    }
    if (doclose) {
      if (props.onClose) props.onClose()
      props.toggle()
    }
  }

  const handleDrag = (movementX, movementY) => {
      const panel = $("#dlgModal")
      if (!panel) return;
      // const { x, y } = panel[0].getBoundingClientRect();
      const { top, left } = panel.offset()
      console.log(`(top,left)=(${top}, ${left}) => mvX,Y=${movementX},${movementY}`)
      const nleft=left + movementX;
      const ntop = top + movementY;
      panel.css( {left: `${nleft}px`, top: `${ntop}px`} )
      //panel.style.left = `${x + movementX}px`;
      //panel.style.top = `${y + movementY}px`;
  };

  function handleMouseUp() {
    m.mouseDown=false
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mousemove', handleMouseMove);
  }

  /*
  useEffect(() => {
    return () => { //cleanup ?
      console.log(" .. drag handlers useEffect cleanup")
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
 */

 function handleMouseMove(e) {
   const ratio = window.devicePixelRatio
   console.log(" ratio = ", ratio)
   handleDrag(e.movementX / ratio, e.movementY / ratio)
 }


 useEffect(()=>{
    //auto focus on the first input field!
    /*
     const tinput = $(".modal-body").find("input[type='text']:enabled:visible:first");
     if (tinput) tinput.focus()
    */
    //const modal=$("#dlgModal")
    //modal.draggable({ handle: ".modal-header" })
    //modal.resizable()
    //from bootstrap docs:
 })

  function handleMouseDown() {
    m.mouseDown=true
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
 }


 function afterOpen() {
    if (props.onShow)
       props.onShow()
 }
 function handleClose() {
    if (props.onClose) props.onClose()
    //this is called even when ESC is pressed!
    props.toggle()
 }
 //  <ModalHeader toggle={props.toggle}>{title}</ModalHeader>
 // onMouseDown={handleMouseDown}
 return (<Modal id="dlgModal" ref={mRef} focus={true} fade={false} backdrop="static"
                isOpen={props.isOpen} toggle={handleClose} onOpened={afterOpen}>
     <div className="modal-header pt-1 mt-0 mdlg-header noselect"  style="height:32px;">
        <div className="modal-title mdlg-title">{title}</div>
        <div type="button" tabindex="-1" className="close" data-dismiss="modal"
          aria-label="Close" onClick={handleClose}>
          <span aria-hidden="true">&times;</span>
        </div>
      </div>
    <Form onSubmit={dlgSubmit}>
    <ModalBody className="app-bg"><Container fluid={true}>
      <FormGroup>
       {props.children}
      </FormGroup>
     </Container>
   </ModalBody>
   <ModalFooter className="justify-content-center app-bg">
     <Row className="d-flex w-75 justify-content-around">
   { props.button && <Button type="submit" className="app-btn" disabled={!props.buttonEnable()}
        onClick={ (e) => {
         if (props.buttonAction) props.buttonAction(e)
         //closing the dialog managed by onSubmit(e) result
     } }>
     {props.button}
    </Button>
   }
    <Button color="secondary rounded-0" onClick={handleClose}>
       {btnClose}
    </Button>
    </Row>
   </ModalFooter>
   </Form>
  </Modal> )

}
