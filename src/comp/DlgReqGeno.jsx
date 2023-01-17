import {DlgModal} from './DlgModal'
import { mwMail, logAction, reqGenotypes } from './RDataCtx';
import $ from 'jquery';
import {Row, Col, Input, Button} from 'reactstrap'

export function DlgReqGeno(props) {
  //let brarr=[]
  let brcount=0;

  function onShow() {
     if (props.getData)
        brcount=props.getData()
     $('#numbr').html(`<b>${brcount}</b>`)
  }

  //onSubmit must be set in the caller
  return ( <DlgModal { ...props} title="Requesting genotype data" button={'Request'} onShow={onShow} buttonClose="Cancel" >
      <p style="font-size:95%;">
        <br />
        If choosing the <i>"Request"</i> button below, a custom VCF.gz file with the genotype data of the
        selected subjects (<span id="numbr"><b>{brcount}</b></span>) will begin assembling in the background.
        <br /> <br />
        Depending on the number of subjects and server load, this can be a lengthy operation
        (15min+) and the resulting file can be several gigabytes in size.

        <br /> <br />When the file is ready a download link will be e-mailed to <b>{props.email}</b>.

      </p>
      {/* <Row className="d-flex flex-nowrap flex-row align-items-center justify-content-center" style="font-size:95%;">
        <Col>Please confirm this genotype data request</Col>
</Row> */}
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
