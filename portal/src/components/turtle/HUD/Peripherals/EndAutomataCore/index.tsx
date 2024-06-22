import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../../../../App';
import {Peripheral, Turtle} from '../../../../../api/UseTurtle';
import './EndAutomataCore.css';
import SavePointModal from './SavePointModal';
import {useState} from 'react';

export interface Props {
    turtle: Turtle;
    side: string;
    peripheral: Peripheral;
    action: Action;
}

function EndAutomataCore(props: Props) {
    const {turtle, side, peripheral, action} = props;
    const {data} = peripheral;
    const [isSavePointModalHidden, setIsSavePointModalHidden] = useState(true);

    if (data == null) return null;

    const {points} = data as {
        points?: string[];
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const {serverId, id, location} = turtle;
    return (
        <>
            {location == null ? null : (
                <SavePointModal
                    isHidden={isSavePointModalHidden}
                    action={action}
                    hideModal={() => setIsSavePointModalHidden(true)}
                    turtle={turtle}
                    side={side}
                    x={location.x}
                    y={location.y}
                    z={location.z}
                />
            )}
            <PeripheralContainer>
                <div>Stored save points:</div>
                <PointsContainer>
                    {points?.map((point, i) => (
                        <Point key={`point-${i}`}>
                            <Btn
                                onClick={() =>
                                    action({
                                        type: 'ACTION',
                                        action: 'end-automata-delete-point',
                                        data: {
                                            serverId,
                                            id,
                                            side,
                                            point,
                                        },
                                    })
                                }
                                type='button'
                                size='xs'
                                className='btn-close'
                            ></Btn>
                            <div>{point}</div>
                            <Btn
                                onClick={() =>
                                    action({
                                        type: 'ACTION',
                                        action: 'end-automata-warp',
                                        data: {
                                            serverId,
                                            id,
                                            side,
                                            point,
                                        },
                                    })
                                }
                                variant='outline-info'
                                size='xs'
                                disabled={!turtle.isOnline}
                            >
                                Warp
                            </Btn>
                        </Point>
                    ))}
                </PointsContainer>
                <Btn
                    onClick={() => setIsSavePointModalHidden(false)}
                    variant='outline-info'
                    size='sm'
                    disabled={!turtle.isOnline}
                >
                    Save point
                </Btn>
            </PeripheralContainer>
        </>
    );
}

const PeripheralContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const PointsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: rgb(39, 41, 61);
    padding: 10px;
    border-radius: 0.25rem;
`;

const Point = styled.div`
    display: flex;
    gap: 5px;
    align-items: center;
`;

export default EndAutomataCore;
