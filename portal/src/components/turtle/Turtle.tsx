import {useParams} from 'react-router-dom';
import {useTurtle} from '../../api/UseTurtle';
import HUD from './HUD';
import Turtle3DMap from './Turtle3DMap';

function Turtle() {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle === undefined) return null;

    return (
        <>
            <Turtle3DMap />
            <HUD />
        </>
    );
}

export default Turtle;
