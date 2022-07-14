import {DlgModal} from './DlgModal'
import {Row, Col, Input, Button} from 'reactstrap'

export function DlgRequest(props) {
  let {datasets, ...oProps} = props
  //props: isOpen={props.isOpen} toggle={props.toggle} onSubmit={submitHandler}
  //       button={yesCaption} buttonClose={noCaption}
  //  buttonEnable={enableSubmit}
  return ( <DlgModal { ...oProps} title="Restricted data" buttonClose="Cancel" >
      <p>
        <br />
        You selected restricted datasets which cannot be accessed at this time.
      </p>
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
