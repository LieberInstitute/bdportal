import './ui.css';
//assumes bootstrap was already loaded in the parent app/component
export function ToastBox({ id, title, show, text }) {
     if (!title) title="Information"
     if (!text) text="  text needed here "
     if (!id) id="infoToast1"
     /* const tlines= text.trim().split(/[\n\r]+/)
     if (tlines.length==0) return null;*/
     const vclass=show ? "toast" : "toast hide"
     return (
      <div class="position-fixed p-1" style="z-index: 200; top: 2em; right: 40em;">
      <div id={id} class={vclass} role="alert" aria-live="assertive"
           aria-atomic="true" data-delay="2000" style="opacity:1;background-color: rgba(255,255,255,0.95);">
        <div class="toast-header-sm">
          {/* <img src="..." class="rounded mr-2" alt="..." /> */}
          <strong class="mr-auto" style="color:#777;">{title}</strong>
          {/* <small>11 mins ago</small> */}
          <button type="button" class="ml-2 mb-1 mr-1 close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
       <div class="toast-body mt-1 pt-0 d-flex flex-column justify-content-center align-content-center" style="color:#b46">
         {/*  tlines.map( (e,i)=> <div key={i} >{e}</div> ) */}
         {text}
       </div>
      </div>
     </div>)
  }
