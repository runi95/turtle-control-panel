import styled from 'styled-components';
import HoeIcon from '../../../icons/HoeIcon';
import PickaxeIcon from '../../../icons/PickaxeIcon';
import HammerIcon from '../../../icons/HammerIcon';
import HomeIcon from '../../../icons/HomeIcon';
import RefuelIcon from '../../../icons/RefuelIcon';
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import FarmModal from '../farm/FarmModal';
import MineModal from '../mine/MineModal';
import BuildModal from '../build/BuildModal';
import {Turtle, useTurtle} from '../../../api/UseTurtle';
import StopIcon from '../../../icons/StopIcon';
import {OverlayTrigger, Tooltip} from 'react-bootstrap';
import {useWebSocket} from '../../../api/UseWebSocket';
import BootsIcon from '../../../icons/BootsIcon';

interface Props {
    setWorldMoveState: (moveState: boolean) => void;
}

function ActionHUD(props: Props) {
    const {setWorldMoveState} = props;
    const [isInMoveState, setMoveState] = useState(false);
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [modalState, setModalState] = useState<'farm' | 'mine' | 'build' | null>(null);

    useEffect(() => {
        setWorldMoveState(isInMoveState);
    }, [isInMoveState]);

    const {data: turtle} = useTurtle(serverId, id);
    if (turtle === undefined) {
        return null;
    }

    const renderModal = (turtle: Turtle) => {
        switch (modalState) {
            case 'farm':
                return <FarmModal turtle={turtle} action={action} hideModal={() => setModalState(null)} />;
            case 'mine':
                return <MineModal turtle={turtle} action={action} hideModal={() => setModalState(null)} />;
            case 'build':
                return <BuildModal turtle={turtle} action={action} hideModal={() => setModalState(null)} />;
            default:
                return null;
        }
    };

    return (
        <>
            {renderModal(turtle)}
            <div style={{display: 'flex', gap: 5}}>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Stop
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer
                        onClick={() => {
                            action({type: 'ACTION', action: 'stop', data: {serverId, id}});
                        }}
                    >
                        <StopIcon color='#BE0101' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Mine
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer onClick={() => setModalState('mine')}>
                        <PickaxeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Farm
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer onClick={() => setModalState('farm')}>
                        <HoeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Build
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer onClick={() => setModalState('build')}>
                        <HammerIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Refuel
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer
                        onClick={() => action({type: 'ACTION', action: 'refuel', data: {serverId, id}})}
                    >
                        <RefuelIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Return home
                        </Tooltip>
                    }
                >
                    <ActionButtonContainer
                        onClick={() => action({type: 'ACTION', action: 'go-home', data: {serverId, id}})}
                    >
                        <HomeIcon color='#202020' />
                    </ActionButtonContainer>
                </OverlayTrigger>
                <OverlayTrigger
                    placement='top'
                    overlay={
                        <Tooltip style={{position: 'fixed'}} data-bs-theme='light'>
                            Move
                        </Tooltip>
                    }
                >
                    {isInMoveState ? (
                        <ActionButtonContainer onClick={() => setMoveState(false)}>
                            <StopIcon color='#202020' />
                        </ActionButtonContainer>
                    ) : (
                        <ActionButtonContainer onClick={() => setMoveState(true)}>
                            <BootsIcon color='#202020' />
                        </ActionButtonContainer>
                    )}
                </OverlayTrigger>
            </div>
        </>
    );
}

const ActionButtonContainer = styled.div`
    cursor: pointer;
    background-color: #c6c6c6;
    padding: 5px;
    border-radius: 4px;
`;

export default ActionHUD;
