import {useParams} from 'react-router-dom';
import {Action} from '../../../App';
import {useTurtle} from '../../../api/UseTurtle';
import styled from 'styled-components';
import {useState} from 'react';
import {Modal} from 'react-bootstrap';
import LocationModal from '../LocationModal';

export interface Props {
    action: Action;
}

function LocationHUD(props: Props) {
    const {action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
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

const LocationText = styled.small`
    cursor: pointer;
    color: #8b8b8b;
`;

export default LocationHUD;
