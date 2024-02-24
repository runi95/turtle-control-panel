import Inventory from './Inventory';
import {useNavigate, useParams} from 'react-router-dom';
import {Action} from '../../App';
import {useTurtle} from '../../api/UseTurtle';
import FuelInfo from '../FuelInfo';
import ActionHUD from './ActionHUD';
import LocationHUD from './LocationHUD';

export interface TurtleProps {
    action: Action;
}

function HUD(props: TurtleProps) {
    const {action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const navigate = useNavigate();
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle === undefined) return null;

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    position: 'fixed',
                    left: '50%',
                    top: 10,
                    transform: 'translateX(-50%)',
                    opacity: 0.8,
                }}
            >
                <FuelInfo fuelLevel={turtle?.fuelLevel} fuelLimit={turtle?.fuelLimit} />
                <div style={{pointerEvents: 'none'}}>
                    <h5>
                        <ins style={{textTransform: 'capitalize'}}>{turtle?.state?.name || 'idle'}</ins>
                    </h5>
                    {turtle.error ? (
                        <h5>
                            <span>
                                {' '}
                                (<span className='text-danger'>{turtle.error}</span>)
                            </span>
                        </h5>
                    ) : turtle.state?.warning ? (
                        <h5>
                            <span>
                                {' '}
                                (<span className='text-warning'>{turtle.state.warning as string}</span>)
                            </span>
                        </h5>
                    ) : null}
                </div>
            </div>
            <div
                style={{
                    position: 'fixed',
                    right: 10,
                    top: 10,
                    opacity: 0.8,
                }}
            >
                <LocationHUD action={action} />
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    opacity: 0.8,
                }}
            >
                <div
                    style={{
                        marginTop: 5,
                        marginLeft: 10,
                        marginBottom: 55,
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        navigate('/dashboard');
                    }}
                >
                    <span style={{fontSize: '1.8em', color: '#c6c6c6'}}>🠈</span>
                </div>
                <Inventory action={action} />
            </div>
            <div
                style={{
                    position: 'fixed',
                    left: '50%',
                    bottom: 10,
                    transform: 'translateX(-50%)',
                    opacity: 0.8,
                }}
            >
                <ActionHUD action={action} />
            </div>
        </>
    );
}

export default HUD;
