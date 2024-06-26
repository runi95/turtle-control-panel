import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../../../App';
import {Turtle} from '../../../../api/UseTurtle';

export interface Props {
    turtle: Turtle;
    action: Action;
}

function CraftingTable(props: Props) {
    const {turtle, action} = props;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const {serverId, id} = turtle;
    return (
        <PeripheralContainer>
            <Btn
                onClick={() => action({type: 'ACTION', action: 'craft', data: {serverId, id}})}
                variant='outline-info'
                size='sm'
                disabled={!turtle.isOnline}
            >
                Craft
            </Btn>
            <Btn
                onClick={() => action({type: 'ACTION', action: 'auto-craft', data: {serverId, id}})}
                variant='outline-info'
                size='sm'
                disabled={!turtle.isOnline}
            >
                Auto Craft
            </Btn>
        </PeripheralContainer>
    );
}

const PeripheralContainer = styled.div`
    display: flex;
    gap: 5px;
`;

export default CraftingTable;
