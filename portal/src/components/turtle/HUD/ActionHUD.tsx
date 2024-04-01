import styled from 'styled-components';
import HoeIcon from '../../../icons/HoeIcon';
import PickaxeIcon from '../../../icons/PickaxeIcon';
import HammerIcon from '../../../icons/HammerIcon';
import HomeIcon from '../../../icons/HomeIcon';
import RefuelIcon from '../../../icons/RefuelIcon';
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import MineModal from '../mine/MineModal';
import BuildModal from '../build/BuildModal';
import {Location, Turtle, useTurtle} from '../../../api/UseTurtle';
import StopIcon from '../../../icons/StopIcon';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';
import {useWebSocket} from '../../../api/UseWebSocket';
import BootsIcon from '../../../icons/BootsIcon';
import {WorldState} from '../Turtle3DMap/World';
import CheckmarkIcon from '../../../icons/CheckmarkIcon';

interface Props {
    setWorldState: (worldState: WorldState | null) => void;
    getSelectedBlocks: () => Location[];
}

function ActionHUD({setWorldState, getSelectedBlocks}: Props) {
    const [hudWorldState, setHudWorldState] = useState<WorldState | null>(null);
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [modalState, setModalState] = useState<'mine' | 'build' | null>(null);

    useEffect(() => {
        setWorldState(hudWorldState);
    }, [hudWorldState]);

    const {data: turtle} = useTurtle(serverId, id);
    if (turtle === undefined) {
        return null;
    }

    const renderModal = (turtle: Turtle) => {
        switch (modalState) {
            case 'mine':
                return <MineModal turtle={turtle} action={action} hideModal={() => setModalState(null)} />;
            case 'build':
                return <BuildModal turtle={turtle} action={action} hideModal={() => setModalState(null)} />;
            default:
                return null;
        }
    };

    if (hudWorldState === WorldState.FARM) {
        return (
            <Container>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Cancel</FixedTooltip>}>
                    <ActionButtonContainer onClick={() => setHudWorldState(null)}>
                        <StopIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Confirm</FixedTooltip>}>
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
                    <ActionButtonContainer onClick={() => setModalState('mine')}>
                        <PickaxeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Farm</FixedTooltip>}>
                    <ActionButtonContainer onClick={() => setHudWorldState(WorldState.FARM)}>
                        <HoeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger placement='top' overlay={<FixedTooltip data-bs-theme='light'>Build</FixedTooltip>}>
                    <ActionButtonContainer onClick={() => setModalState('build')}>
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
                    {hudWorldState === WorldState.MOVE ? (
                        <ActionButtonContainer onClick={() => setHudWorldState(null)}>
                            <StopIcon color='#202020' />
                        </ActionButtonContainer>
                    ) : (
                        <ActionButtonContainer onClick={() => setHudWorldState(WorldState.MOVE)}>
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

export default ActionHUD;
