import $ from 'jquery';
import { useRef, useEffect } from 'preact/hooks';
import './ui.css';
//assumes bootstrap was already loaded in the parent app/component
export function ToastBox({ id, title, show, text, autohide }) {
     if (!title) title="Information"
     if (!text) text="  text needed here "
     if (!id) id="infoToast1"
     autohide=(typeof autohide=='undefined' || autohide == "true" || autohide==1 || autohide=="on") ? "true" : "false";
     const vclass=show ? "toast" : "toast hide"
     return (
      <div class="position-fixed p-1" style="z-index: 200; top: 2em; right: 34em;min-width:24em;">
      <div id={id} class={vclass} role="alert" aria-live="assertive" data-autohide={autohide}
           aria-atomic="true" data-delay="7000" style="opacity:1;background-color: rgba(255,255,255,0.94);">
        <div class="toast-header-sm noselect text-center">
          {/* <img src="..." class="rounded mr-2" alt="..." /> */}
          <strong class="w-100" style="color:#777;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{title}</strong>
          {/* <small>11 mins ago</small> */}
          <button type="button" class="ml-2 mb-1 mr-1 close app-btn-close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
       <div class="toast-body mt-1 pt-0 text-center" style="color:#b46">
         {text}
       </div>
      </div>
     </div>)
  }
