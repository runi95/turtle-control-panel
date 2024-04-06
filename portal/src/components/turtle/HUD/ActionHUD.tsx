import styled from 'styled-components';
import HoeIcon from '../../../icons/HoeIcon';
import PickaxeIcon from '../../../icons/PickaxeIcon';
import HammerIcon from '../../../icons/HammerIcon';
import HomeIcon from '../../../icons/HomeIcon';
import RefuelIcon from '../../../icons/RefuelIcon';
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Location, Turtle, useTurtle} from '../../../api/UseTurtle';
import StopIcon from '../../../icons/StopIcon';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';
import {useWebSocket} from '../../../api/UseWebSocket';
import BootsIcon from '../../../icons/BootsIcon';
import {WorldState} from '../Turtle3DMap/World';
import CheckmarkIcon from '../../../icons/CheckmarkIcon';
import SingleSelectIcon from '../../../icons/SingleSelectIcon';
import ChunkFullSelectIcon from '../../../icons/ChunkFullSelectIcon';
import MineModal from '../mine/MineModal';
import {Block} from '../../../App';
import ItemSprite from './Inventory/ItemSprite';
import BuildModal from '../build/BuildModal';

enum HUDControlState {
    MOVE,
    FARM,
    MINE,
    BUILD,
}

type HUDState = {
    control: HUDControlState;
    selection: WorldState | null;
};

type ModalState = {
    modal: 'build' | 'mine';
    data: unknown;
};

interface Props {
    setWorldState: (worldState: WorldState | null) => void;
    getSelectedBlocks: () => Location[];
    getBuiltBlocks: () => Omit<Block, 'state' | 'tags'>[];
    setBuildBlockType: (type: string) => void;
}

function ActionHUD({setWorldState, getSelectedBlocks, getBuiltBlocks, setBuildBlockType}: Props) {
    const [hudWorldState, setHudWorldState] = useState<HUDState | null>(null);
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [uiBlockType, setUIBlockType] = useState<string>('minecraft:cobblestone');

    useEffect(() => {
        if (hudWorldState == null) {
            setWorldState(null);
        } else {
            setWorldState(hudWorldState.selection);
        }
    }, [hudWorldState]);

    const {data: turtle} = useTurtle(serverId, id);
    if (turtle === undefined) {
        return null;
    }

    const renderModal = (turtle: Turtle) => {
        switch (modalState?.modal) {
            case 'mine':
                return (
                    <MineModal
                        turtle={turtle}
                        action={action}
                        hideModal={() => setModalState(null)}
                        createdArea={modalState.data as Location[]}
                    />
                );
            default:
                return null;
        }
    };

    switch (hudWorldState?.control) {
        case HUDControlState.FARM:
            return (
                <Container>
                    <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Cancel</FixedTooltip>}>
                        <ActionButtonContainer onClick={() => setHudWorldState(null)}>
                            <StopIcon color='#202020' />
                        </ActionButtonContainer>
                    </OverlayTrigger>
                    <OverlayTrigger
                        placement='top'
                        overlay={<FixedTooltip data-bs-theme='light'>Confirm</FixedTooltip>}
                    >
                        <ActionButtonContainer
                            onClick={() => {
                                const locations = getSelectedBlocks();
                                action({
                                    type: 'ACTION',
                                    action: 'farm',
                                    data: {
                                        serverId,
                                        id: Number(id),
                                        area: locations.map(({x, y, z}) => ({
                                            x,
                                            y: y + 1,
                                            z,
                                        })),
                                    },
                                });
                                setHudWorldState(null);
                            }}
                        >
                            <CheckmarkIcon color='#202020' />
                        </ActionButtonContainer>
                    </OverlayTrigger>
                </Container>
            );
        case HUDControlState.MINE:
            return (
                <Container>
                    <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Cancel</FixedTooltip>}>
                        <ActionButtonContainer onClick={() => setHudWorldState(null)}>
                            <StopIcon color='#202020' />
                        </ActionButtonContainer>
                    </OverlayTrigger>
                    {(() => {
                        switch (hudWorldState.selection) {
                            case WorldState.SELECT_SINGLE:
                                return (
                                    <OverlayTrigger
                                        placement='top'
                                        overlay={<FixedTooltip data-bs-theme='light'>Mode</FixedTooltip>}
                                    >
                                        <ActionButtonContainer
                                            onClick={() =>
                                                setHudWorldState({
                                                    control: HUDControlState.MINE,
                                                    selection: WorldState.SELECT_CHUNK_FULL,
                                                })
                                            }
                                        >
                                            <SingleSelectIcon color='#346bc1' />
                                        </ActionButtonContainer>
                                    </OverlayTrigger>
                                );
                            case null:
                            case WorldState.SELECT_CHUNK_FULL:
                                return (
                                    <OverlayTrigger
                                        placement='top'
                                        overlay={<FixedTooltip data-bs-theme='light'>Selection Mode</FixedTooltip>}
                                    >
                                        <ActionButtonContainer
                                            onClick={() =>
                                                setHudWorldState({
                                                    control: HUDControlState.MINE,
                                                    selection: WorldState.SELECT_SINGLE,
                                                })
                                            }
                                        >
                                            <ChunkFullSelectIcon color='#346bc1' />
                                        </ActionButtonContainer>
                                    </OverlayTrigger>
                                );
                        }
                    })()}
                    <OverlayTrigger
                        placement='top'
                        overlay={<FixedTooltip data-bs-theme='light'>Confirm</FixedTooltip>}
                    >
                        <ActionButtonContainer
                            onClick={() => {
                                setModalState({
                                    modal: 'mine',
                                    data: getSelectedBlocks(),
                                });
                                setHudWorldState(null);
                            }}
                        >
                            <CheckmarkIcon color='#202020' />
                        </ActionButtonContainer>
                    </OverlayTrigger>
                </Container>
            );
        case HUDControlState.BUILD:
            return (
                <>
                    {modalState?.modal === 'build' ? (
                        <BuildModal
                            hideModal={() => setModalState(null)}
                            onSubmit={(type: string) => {
                                setBuildBlockType(type);
                                setUIBlockType(type);
                            }}
                        />
                    ) : null}
                    <Container>
                        <OverlayTrigger
                            placement='top'
                            overlay={<FixedTooltip data-bs-theme='light'>Cancel</FixedTooltip>}
                        >
                            <ActionButtonContainer
                                onClick={() => {
                                    setHudWorldState(null);
                                    setUIBlockType('minecraft:cobblestone');
                                }}
                            >
                                <StopIcon color='#202020' />
                            </ActionButtonContainer>
                        </OverlayTrigger>
                        <OverlayTrigger
                            placement='top'
                            overlay={<FixedTooltip data-bs-theme='light'>Change block</FixedTooltip>}
                        >
                            <ActionButtonContainer
                                onClick={() =>
                                    setModalState({
                                        modal: 'build',
                                        data: null,
                                    })
                                }
                            >
                                <BuildSpriteContainer>
                                    <ItemSprite name={uiBlockType} />
                                </BuildSpriteContainer>
                            </ActionButtonContainer>
                        </OverlayTrigger>
                        <OverlayTrigger
                            placement='top'
                            overlay={<FixedTooltip data-bs-theme='light'>Confirm</FixedTooltip>}
                        >
                            <ActionButtonContainer
                                onClick={() => {
                                    action({
                                        type: 'ACTION',
                                        action: 'build',
                                        data: {
                                            serverId,
                                            id: turtle.id,
                                            blocks: getBuiltBlocks()
                                                .sort((a, b) => {
                                                    if (a.y < b.y) {
                                                        return 1;
                                                    } else if (a.y > b.y) {
                                                        return -1;
                                                    } else if (a.x < b.x) {
                                                        return -1;
                                                    } else if (a.x > b.x) {
                                                        return 1;
                                                    } else if (a.z < b.z) {
                                                        return -1;
                                                    } else if (a.z > b.z) {
                                                        return 1;
                                                    }

                                                    return 0;
                                                })
                                                .map(({x, y, z, name}) => ({
                                                    name,
                                                    x: x + turtle.location.x,
                                                    y: y + turtle.location.y,
                                                    z: z + turtle.location.z,
                                                })),
                                        },
                                    });
                                    setHudWorldState(null);
                                    setUIBlockType('minecraft:cobblestone');
                                }}
                            >
                                <CheckmarkIcon color='#202020' />
                            </ActionButtonContainer>
                        </OverlayTrigger>
                    </Container>
                </>
            );
    }

    return (
        <>
            {renderModal(turtle)}
            <Container>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Stop</FixedTooltip>}>
                    <ActionButtonContainer
                        onClick={() => {
                            action({type: 'ACTION', action: 'stop', data: {serverId, id}});
                        }}
                    >
                        <StopIcon color='#BE0101' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Mine</FixedTooltip>}>
                    <ActionButtonContainer
                        onClick={() =>
                            setHudWorldState({
                                control: HUDControlState.MINE,
                                selection: WorldState.SELECT_CHUNK_FULL,
                            })
                        }
                    >
                        <PickaxeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Farm</FixedTooltip>}>
                    <ActionButtonContainer
                        onClick={() =>
                            setHudWorldState({
                                control: HUDControlState.FARM,
                                selection: WorldState.SELECT_SINGLE,
                            })
                        }
                    >
                        <HoeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Build</FixedTooltip>}>
                    <ActionButtonContainer
                        onClick={() => {
                            setBuildBlockType('minecraft:cobblestone');
                            setHudWorldState({
                                control: HUDControlState.BUILD,
                                selection: WorldState.BUILD,
                            });
                        }}
                    >
                        <HammerIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Refuel</FixedTooltip>}>
                    <ActionButtonContainer
                        onClick={() => action({type: 'ACTION', action: 'refuel', data: {serverId, id}})}
                    >
                        <RefuelIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={<FixedTooltip data-bs-theme='light'>Return home</FixedTooltip>}
                >
                    <ActionButtonContainer
                        onClick={() => action({type: 'ACTION', action: 'go-home', data: {serverId, id}})}
                    >
                        <HomeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Move</FixedTooltip>}>
                    {hudWorldState?.control === HUDControlState.MOVE ? (
                        <ActionButtonContainer onClick={() => setHudWorldState(null)}>
                            <StopIcon color='#202020' />
                        </ActionButtonContainer>
                    ) : (
                        <ActionButtonContainer
                            onClick={() =>
                                setHudWorldState({
                                    control: HUDControlState.MOVE,
                                    selection: WorldState.MOVE,
                                })
                            }
                        >
                            <BootsIcon color='#202020' />
                        </ActionButtonContainer>
                    )}
                </OverlayTrigger>
            </Container>
        </>
    );
}

const FixedTooltip = styled(Tooltip)`
    position: fixed;
`;

const Container = styled.div`
    display: flex;
    gap: 5px;
`;

const ActionButtonContainer = styled.div`
    cursor: pointer;
    background-color: #c6c6c6;
    padding: 5px;
    border-radius: 4px;
`;

const BuildSpriteContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    cursor: pointer;
    align-items: center;
    width: 48px;
    height: 48px;
`;

export default ActionHUD;
