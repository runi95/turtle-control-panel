import {useParams} from 'react-router-dom';
import {Action} from '../../App';
import {useTurtle} from '../../api/UseTurtle';
import HUD from './HUD';
import Turtle3DMap from './Turtle3DMap';

export interface TurtleProps {
    action: Action;
}

function Turtle(props: TurtleProps) {
    const {action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle === undefined) return null;

    return (
        <>
            <Turtle3DMap action={action} />
            <HUD action={action} />
        </>
    );
}

export default Turtle;
