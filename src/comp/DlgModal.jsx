import { createPortal } from 'preact/compat';
import Close from "../assets/close.svg";

import './DlgModal.css';
/*
DlgDownload is a stateless functional component that takes props and only 
  returns HTML when isShowing is true.

Portals allow React components to render in another part of the DOM 
that is outside of their parent component. We can use a Portal to mount our 
DlgDownload component to the end of the document.body element, rather than 
as a child of another component. 
*/
export function DlgModal( props ) {
  return (props.isShowing) ? createPortal(
  <>
    <div className="dlgmodal-overlay" />
    <div className="dlgmodal-wrapper" aria-modal aria-hidden tabIndex={-1} role="dialog">
      <div className="dlgmodal">
        <div className="dlgmodal-header" style={{textAlign:"center"}}>
          <div style={{textAlign:"center", width:"100%", fontSize:"120%", fontWeight:"bold"}}>{props.title}</div>
          <button type="button" className="dlgmodal-close-button" 
                   data-dismiss="modal" aria-label="Close" onClick={props.hide}> <span aria-hidden="true">&times;</span>
          </button>
          <div className="row pb-4 mb-4" />
        </div>

        {props.children}

        { props.justClose &&   
         <div className="row form-group justify-content-center ">
           <div className="col-6 align-self-center text-center">
             <button className="btn btn-light" onClick={props.hide}>Close</button>
           </div>
         </div> 
        }
      </div>
    </div>
  </>, document.body
) : null;
}
