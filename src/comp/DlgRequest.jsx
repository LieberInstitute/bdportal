import { createPortal } from 'preact/compat';
import {DlgModal} from './DlgModal';

export function DlgRequest(props) {
  let {datasets, ...oProps} = props
  return (<DlgModal { ...oProps} title="Restricted data" >
        <p><br />
        The following datasets are restricted. Please enter access keys for each datasets or 
        press the <b>Request Access</b> button below to request access to them. 
        </p>
        <div className="row form-group">
             <div className="col-4 align-self-center"> </div>
             <div className="col-4 align-self-center"> Access code  </div>        
        </div>
        { datasets.map( (dset)=> 
              <div className="row form-group">
                <div className="col-4 align-self-center">{dset}</div>
                <div className="col-4 align-self-center"><input type="text" name="name" /></div>
                <div className="col-4 align-self-center"> <button className="btn btn-primary">Unlock</button> </div>
              </div>
        ) }
        <div className="row form-group justify-content-left ">
          If you are requesting access, please enter a brief justification below,
          to be sent along with your request.
          <textarea style={{width:"100%" }} >
          </textarea>
          </div>
          <div className="row form-group justify-content-center ">
            <div className="col-6 align-self-center text-center">
            <button className="btn btn-primary">Request Access</button>
            </div>
            <div className="col-6 align-self-center text-center">
            <button className="btn btn-light" onClick={props.hide}>Cancel</button>
            </div>
         </div> 
     </DlgModal>
)
}
