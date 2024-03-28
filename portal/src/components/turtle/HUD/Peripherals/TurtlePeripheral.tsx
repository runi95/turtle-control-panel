import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../../../App';
import {Turtle} from '../../../../api/UseTurtle';

export interface Props {
    turtle: Turtle;
    side: string;
    action: Action;
}

function TurtlePeripheral(props: Props) {
    const {turtle, side, action} = props;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const {serverId, id} = turtle;
    return (
        <PeripheralContainer>
            <Btn
                onClick={() =>
                    action({
                        type: 'ACTION',
                        action: 'use-peripheral',
                        data: {
                            serverId,
                            id,
                            side,
                            method: 'turnOn',
                            args: [],
                        },
                    })
                }
                variant='outline-info'
                size='sm'
                disabled={!turtle.isOnline}
            >
                Turn on
            </Btn>
            <Btn
                onClick={() =>
                    action({
                        type: 'ACTION',
                        action: 'use-peripheral',
                        data: {
                            serverId,
                            id,
                            side,
                            method: 'reboot',
                            args: [],
                        },
                    })
                }
                variant='outline-warning'
                size='sm'
                disabled={!turtle.isOnline}
            >
                Reboot
            </Btn>
            <Btn
                onClick={() =>
                    action({
                        type: 'ACTION',
                        action: 'use-peripheral',
                        data: {
                            serverId,
                            id,
                            side,
                            method: 'shutdown',
                            args: [],
                        },
                    })
                }
                variant='outline-danger'
                size='sm'
                disabled={!turtle.isOnline}
            >
                Shutdown
            </Btn>
        </PeripheralContainer>
    );
}

const PeripheralContainer = styled.div`
    display: flex;
    gap: 5px;
`;

export default TurtlePeripheral;
