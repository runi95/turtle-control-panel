import {Button} from 'react-bootstrap';
import './Inventory.css';
import {Action, Turtle} from '../../App';

export interface PeripheralProps {
    types: string[];
    turtle: Turtle;
    action: Action;
}

function Peripheral(props: PeripheralProps) {
    const {types, turtle, action} = props;

    const {id} = turtle;
    if (types.includes('inventory')) {
        return (
            <div>
                <Button variant='outline-info' size='sm' disabled={!turtle.isOnline}>
                    Inventory
                </Button>
            </div>
        );
    }

    if (types.includes('modem')) {
        return (
            <div>
                <Button
                    onClick={() => action({type: 'ACTION', action: 'locate', data: {id}})}
                    variant={turtle.location === null ? 'outline-success' : 'outline-secondary'}
                    size='sm'
                    disabled={!turtle.isOnline}
                >
                    Locate
                </Button>
            </div>
        );
    }

    if (types.includes('geoScanner')) {
        return (
            <div>
                <Button
                    onClick={() => action({type: 'ACTION', action: 'scan', data: {id}})}
                    variant='outline-info'
                    size='sm'
                    disabled={!turtle.isOnline}
                >
                    Scan
                </Button>
            </div>
        );
    }

    return null;
}

export default Peripheral;
