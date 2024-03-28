import {useRef} from 'react';
import HUD from './HUD';
import Turtle3DMap from './Turtle3DMap';
import {WorldHandle} from './Turtle3DMap/World';

function Turtle() {
    const worldRef = useRef<WorldHandle>(null!);

    function setWorldMoveState(moveState: boolean) {
        if (worldRef.current == null) return;

        worldRef.current.setMoveState(moveState);
    }

    return (
        <>
            <Turtle3DMap worldRef={worldRef} />
            <HUD setWorldMoveState={setWorldMoveState} />
        </>
    );
}

export default Turtle;
