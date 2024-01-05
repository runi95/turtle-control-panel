import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../App';
import {Turtle} from '../../api/UseTurtle';

export interface PeripheralProps {
    types: string[];
    turtle: Turtle;
    action: Action;
}

function Peripheral(props: PeripheralProps) {
    const {types, turtle, action} = props;

    const {serverId, id} = turtle;
    if (types.includes('modem')) {
        return (
            <PeripheralGroup>
                <div style={{marginBottom: 8}}>
                    <small>Modem</small>
                </div>
                <PeripheralContainer>
                    <Button
                        onClick={() => action({type: 'ACTION', action: 'locate', data: {serverId, id}})}
                        variant={turtle.location === null ? 'outline-success' : 'outline-secondary'}
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Locate
                    </Button>
                </PeripheralContainer>
            </PeripheralGroup>
        );
    }

    if (types.includes('geoScanner')) {
        return (
            <PeripheralGroup>
                <div style={{marginBottom: 8}}>
                    <small>Geo Scanner</small>
                </div>
                <PeripheralContainer>
                    <Button
                        onClick={() => action({type: 'ACTION', action: 'scan', data: {serverId, id}})}
                        variant='outline-info'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Scan
                    </Button>
                    <Button
                        onClick={() => action({type: 'ACTION', action: 'analyze', data: {serverId, id}})}
                        variant='outline-info'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Analyze
                    </Button>
                </PeripheralContainer>
            </PeripheralGroup>
        );
    }

    return null;
}

const PeripheralGroup = styled.div`
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 8px;
    border-radius: 6%;
`;

const PeripheralContainer = styled.div`
    display: flex;
    gap: 5px;
`;

export default Peripheral;
