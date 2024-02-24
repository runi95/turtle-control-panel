import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../App';
import {Peripheral as APIPeripheral, Turtle} from '../../api/UseTurtle';

export interface PeripheralProps {
    peripheral: APIPeripheral;
    turtle: Turtle;
    action: Action;
}

function Peripheral(props: PeripheralProps) {
    const {peripheral, turtle, action} = props;
    const {types, data} = peripheral;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const {serverId, id} = turtle;
    if (types.includes('modem') && (data as {isWireless: boolean} | undefined)?.isWireless) {
        return (
            <PeripheralGroup>
                <div style={{marginBottom: 8}}>
                    <small>Modem</small>
                </div>
                <PeripheralContainer>
                    <Btn
                        onClick={() => action({type: 'ACTION', action: 'locate', data: {serverId, id}})}
                        variant={turtle.location === null ? 'outline-success' : 'outline-secondary'}
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Locate
                    </Btn>
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
                    <Btn
                        onClick={() => action({type: 'ACTION', action: 'scan', data: {serverId, id}})}
                        variant='outline-info'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Scan
                    </Btn>
                    <Btn
                        onClick={() => action({type: 'ACTION', action: 'analyze', data: {serverId, id}})}
                        variant='outline-info'
                        size='sm'
                        disabled={!turtle.isOnline}
                    >
                        Analyze
                    </Btn>
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
