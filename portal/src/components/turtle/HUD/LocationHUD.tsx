import {useParams} from 'react-router-dom';
import {useTurtle} from '../../../api/UseTurtle';
import styled from 'styled-components';
import {useState} from 'react';
import {Modal} from 'react-bootstrap';
import LocationModal from '../LocationModal';
import {useWebSocket} from '../../../api/UseWebSocket';

function LocationHUD() {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [isModalShown, setIsModalShown] = useState(false);
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle === undefined) return null;

    const directionToString = (direction: number) => {
        return ['W', 'N', 'E', 'S'][direction - 1];
    };

    return (
        <>
            <Modal show={isModalShown} onHide={() => setIsModalShown(false)}>
                <LocationModal turtle={turtle} action={action} hideModal={() => setIsModalShown(false)} />
            </Modal>
            <LocationText
                onClick={() => {
                    setIsModalShown(true);
                }}
            >
                {turtle?.direction ? `${directionToString(turtle.direction)}` : '_'} (
                {turtle?.location ? `${turtle.location.x}, ${turtle.location.y}, ${turtle.location.z}` : '?, ?, ?'})
            </LocationText>
        </>
    );
}

const LocationText = styled.span`
    cursor: pointer;
    color: #8b8b8b;
    text-shadow:
        1px 0 #323232,
        -1px 0 #323232,
        0 1px #323232,
        0 -1px #323232,
        1px 1px #323232,
        -1px -1px #323232,
        1px -1px #323232,
        -1px 1px #323232;
`;

export default LocationHUD;
