import './Dashboard.css';
import {Servers} from '../App';
import Server from './Server';
import {Col, Container, Row} from 'react-bootstrap';

export interface DashboardProps {
    servers: Servers;
}

function Dashboard(props: DashboardProps) {
    const {servers} = props;

    return (
        <Container fluid>
            {Object.values(servers).map((server) => (
                <Row key={server.id} className='mt-3'>
                    <Col>
                        <Server server={server} />
                    </Col>
                </Row>
            ))}
        </Container>
    );
}

export default Dashboard;
