import {Modal} from 'react-bootstrap';
import ConfigModal from './ConfigModal';
import {useTurtle} from '../../../api/UseTurtle';
import {useState} from 'react';
import {useWebSocket} from '../../../api/UseWebSocket';
import {useParams} from 'react-router-dom';

function ConfigHUD() {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [isModalShown, setIsModalShown] = useState(false);
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle == null) return null;

    return (
        <>
            <Modal show={isModalShown} onHide={() => setIsModalShown(false)}>
                <ConfigModal turtle={turtle} action={action} hideModal={() => setIsModalShown(false)} />
            </Modal>
            <div
                style={{
                    marginTop: 5,
                    marginRight: 10,
                    cursor: 'pointer',
                }}
                onClick={() => {
                    setIsModalShown(true);
                }}
            >
                <b style={{fontSize: '1.8em', color: '#c6c6c6'}}>⛭</b>
            </div>
        </>
    );
}

export default ConfigHUD;
