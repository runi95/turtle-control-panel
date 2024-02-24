import './Dashboard.css';
import {Action, Servers} from '../App';
import Server from './Server';
import {Button, Col, Container, Row} from 'react-bootstrap';
import {useState} from 'react';
import DashboardEditor from './DashboardEditor';

export interface DashboardProps {
    servers: Servers;
    action: Action;
}

function Dashboard(props: DashboardProps) {
    const [isInEditMode, setEditModeEnabled] = useState(false);
    const {servers, action} = props;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return isInEditMode ? (
        <DashboardEditor servers={servers} action={action} closeEditMode={() => setEditModeEnabled(false)} />
    ) : (
        <Container fluid>
            {Object.values(servers).map((server) => (
                <Row key={server.id} className='mt-3'>
                    <Col>
                        <Server server={server} action={action} />
                    </Col>
                </Row>
            ))}
            <Row>
                <Col>
                    <Btn variant='link' size='sm' onClick={() => setEditModeEnabled(true)}>
                        Update server names
                    </Btn>
                </Col>
            </Row>
        </Container>
    );
}

export default Dashboard;
