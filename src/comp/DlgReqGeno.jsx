import {DlgModal} from './DlgModal'
import { mwMail, logAction, reqGenotypes } from './RDataCtx';
import $ from 'jquery';
import {Row, Col, Input, Button} from 'reactstrap'

export function DlgReqGeno(props) {
  let brarr=[]
  function onShow() {
     if (props.getData)  {
        brarr=props.getData()
     }
     $('#numbr').html(`<b>${brarr.length}</b>`)
  }

  function submitRequest() {
    //console.log("submit request with brlist=", brarr)
    reqGenotypes(brarr);
    //logAction('req_geno', [4,3,1,2], brarr.join(','))
    //mwMail("geo.pertea@gmail.com", "here get the list", brarr.slice(0,4))
    return true;
  }

  return ( <DlgModal { ...props} title="Requesting genotype data" button={'Request'} onShow={onShow} onSubmit={submitRequest} buttonClose="Cancel" >
      <p style="font-size:95%;">
        <br />
        After clicking the <i>"Request"</i> button below, a VCF.gz file with the genotype data of the
        selected brain set (<span id="numbr"><b>{brarr.length}</b></span>) will be assembled in the background.
        <br /> <br />
        Depending on the number of subjects and server load, this can be a lengthy operation and it might take a while.

        <br /> <br />When the file is ready, a download link will be e-mailed to <b>{props.email}</b>.

      </p>
      <Row className="d-flex flex-nowrap flex-row align-items-center justify-content-center" style="font-size:95%;">
        <Col>Are you sure you want to begin preparing this genotype file for download?</Col>
      </Row>
      {/*  button="Request"
        <p><br />
        The following datasets are restricted. Please enter access codes for each dataset or
        press the <b>Request Access</b> button below to request access to them.
        </p>
        <Row className="form-group">
             <div className="col-5 align-self-center"> </div>
             <div className="col-5 align-self-center"> Access code  </div>
        </Row>
        { datasets.map( (dset)=>
              <Row className="form-group" style="font-size:90%;font-weight:bold;" key={dset}>
                <Col xs="5" className="align-self-center">{dset}</Col>
                <Col xs="4" className="align-self-center"><Input type="text" name="name" /> </Col>
                <Col xs="3" className="align-self-center">
                       <Button className="btn-primary">Unlock</Button> </Col>
              </Row>
        ) }
        <Row className="form-group justify-content-left ">
          If you are requesting access, please enter a brief justification below,
          to be sent along with your request.
          <textarea style={{ width:"100%" }} >  </textarea>
        </Row>
      */}

     </DlgModal>
)
}
