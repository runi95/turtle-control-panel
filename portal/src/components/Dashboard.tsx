import './Dashboard.css';
import {Action} from '../App';
import Server from './Server';
import {Button, Col, Container, Row} from 'react-bootstrap';
import {useState} from 'react';
import DashboardEditor from './DashboardEditor';
import {useServers} from '../api/UseServers';

export interface DashboardProps {
    action: Action;
}

function Dashboard(props: DashboardProps) {
    const [isInEditMode, setEditModeEnabled] = useState(false);
    const {action} = props;
    const {data: servers} = useServers();

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    if (servers == null) return null;

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
