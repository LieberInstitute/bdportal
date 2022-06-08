import { h } from 'preact';
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'
import '../../comp/ui.css';
import './style.css';

const LongRnaPages = ( {tab} ) => (
	<Col>
		<Row><h1>Long RNA-seq Data</h1></Row>
		<Row><p>Query and explore available long read RNA-seq data.</p></Row>
	</Col>
);

export default LongRnaPages;
