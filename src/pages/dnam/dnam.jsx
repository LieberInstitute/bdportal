import { h } from 'preact';
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import '../../comp/ui.css';
import './style.css';


const MetPages = ( {tab} ) => (
	<Col>
	  <Row>
    		<h1>DNA Methylation data</h1>
	  </Row>
		<Row>
			<p>This is the page to explore DNA Methylation data.</p>
		</Row>
	</Col>
);

export default MetPages;
