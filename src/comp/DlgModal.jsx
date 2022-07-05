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
       onShow   : function to be called every time the dialog is shown
                 (to initialize data etc.)


*/
export function DlgModal ( props ) {
  if (! (props.toggle && typeof(props.toggle)==='function') )
    throw new Error('DlgModal: props.toggle function must be provided !')

  const refData=useRef( {
      mouseDown: false,
      pxratio: 1
    }) //keep track of mouse down state

  const dlgRef=useRef(null)
  const hRef=useRef(null) //header ref

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

   useEffect(()=>{
    //auto focus on the first input field!
    /*
     const tinput = $(".modal-body").find("input[type='text']:enabled:visible:first");
     if (tinput) tinput.focus()
    */
 })

 function afterOpen() {
    $(hRef.current).on('mousedown touchstart', (edown)=> {
          // if (not_focused?) return?
          edown.stopPropagation()
          edown.preventDefault()
          //const drg=$(this) // or $(edown.target) ?
          //const drg=$(edown.target)
          const drg=$(hRef.current)
          // href/dlg.addClass("dragging") ?
          let x = edown.pageX - drg.offset().left,
              y = edown.pageY - drg.offset().top;
          //handling drag (mouse move)
          $(document).on('mousemove.dragmdlg touchmove.dragmdlg', (e) => {
             e.stopPropagation();
             e.preventDefault();
             if (e.originalEvent.touches && e.originalEvent.touches.length) {
               e = e.originalEvent.touches[0];
             } else if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
               e = e.originalEvent.changedTouches[0];
             }
             let mdlg=drg.closest('.modal-dialog')
             let nx=e.pageX - x, ny=e.pageY - y
             const xbound=80-mdlg.width()
             if (nx<xbound) nx=xbound;
             const ww=$(window).width()-40;
             if (nx>ww) nx=ww;
             if (ny<0) ny=0;
             const wh=$(window).height()-40;
             if (ny>wh) ny=wh;
             mdlg.offset({ left: nx, top: ny })
          })
        //handling drag ending:
        $(document).on('mouseup.dragmdlg touchend.dragmdlg touchcancel.dragmdlg', ()=> {
             $(document).off('.dragmdlg')
        })
    })
    $(hRef.current).on('dragstart', (e)=>e.preventDefault() );

    if (props.onShow)
           props.onShow()
 }

 function afterClose() {
    $(document).off('.dragmdlg')
    $(hRef.current).off('mousedown touchstart dragstart')
    if (props.onClose) props.onClose()
 }

 function handleClose() {
    if (props.onClose) props.onClose()
    //this is called even when ESC is pressed!
    props.toggle()
 }
 //  <ModalHeader toggle={props.toggle}>{title}</ModalHeader>
 // onMouseDown={handleMouseDown}
  //console.log(" ---- passed width = ", props.width)
  return (<Modal id="dlgModal" ref={dlgRef} focus={true} fade={false} backdrop="static"
           isOpen={props.isOpen} toggle={handleClose} onOpened={afterOpen} onClosed={afterClose}
           width={props.width} style={ props.width ? { minWidth: props.width } : null }>
     <div className="modal-header pt-1 mt-0 mdlg-header noselect" ref={hRef} style="height:32px;">
        <div className="modal-title mdlg-title">{title}</div>
        <div type="button" tabindex="-1" className="close" data-dismiss="modal"
          aria-label="Close" onClick={handleClose}>
          <span aria-hidden="true">&times;</span>
        </div>
      </div>
    <Form onSubmit={dlgSubmit}>
    <ModalBody className="mb-0 pb-1 app-bg"><Container fluid={true}>
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
