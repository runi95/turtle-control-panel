import {useRef} from 'react';
import HUD from './HUD';
import Turtle3DMap from './Turtle3DMap';
import {WorldHandle, WorldState} from './Turtle3DMap/World';

function Turtle() {
    const worldRef = useRef<WorldHandle>(null!);

    function setWorldState(worldState: WorldState | null) {
        if (worldRef.current == null) return;
        worldRef.current.setState(worldState);
    }

    function getSelectedBlocks() {
        if (worldRef.current == null) return [];
        return worldRef.current.getSelectedBlocks();
    }

    function getBuiltBlocks() {
        if (worldRef.current == null) return [];
        return worldRef.current.getBuiltBlocks();
    }

    function setBuildBlockType(type: string) {
        if (worldRef.current == null) return;
        worldRef.current.setBuildBlockType(type);
    }

    return (
        <>
            <Turtle3DMap worldRef={worldRef} />
            <HUD
                setWorldState={setWorldState}
                getSelectedBlocks={getSelectedBlocks}
                getBuiltBlocks={getBuiltBlocks}
                setBuildBlockType={setBuildBlockType}
            />
        </>
    );
}

export default Turtle;
