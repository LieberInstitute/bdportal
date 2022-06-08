import $ from 'jquery';
import { DlgModal } from './DlgModal';
import {useState, useEffect, useRef, useReducer} from "preact/hooks";

import {Row, Col} from 'reactstrap';

/* additional props supported besides DlgModal:
     prompt : question text (default: "Are you sure?")
     onConfirm : callback to execute when the confirm/OK button was clicked
  These inherited props can be used to modify the default:
     title : change the title of the dialog (default: "Confirm")
     button : change the caption of the confirm button (default: "Yes")
     buttonClose : change the caption of the close/cancel button ("No")
*/
export function DlgConfirm( props ) {
  const prompt = props.prompt ? props.prompt : "Are you sure?"
  const title = props.title ? props.title : "Confirm"
  const yesCaption = props.button ? props.button : "Yes"
  const noCaption = props.buttonClose ? props.buttonClose : "No"

  function submitHandler(e) {
      if (props.onConfirm) props.onConfirm(e)
      return true
  }

  return (
    <DlgModal title={title} isOpen={props.isOpen} toggle={props.toggle} onSubmit={submitHandler}
      button={yesCaption} buttonClose={noCaption}>
      <Row className="p-1 d-flex form-group align-items-center justify-content-center">
             <span style="font-size:120%; font-weight:800;">{prompt}</span>
      </Row>
      <Row className="w-100 d-flex align-items-center" />
    </DlgModal>
    )
}