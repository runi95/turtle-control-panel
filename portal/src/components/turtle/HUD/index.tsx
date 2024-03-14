import Inventory from './Inventory';
import {useNavigate, useParams} from 'react-router-dom';
import {Action} from '../../../App';
import {useTurtle} from '../../../api/UseTurtle';
import FuelInfo from '../../FuelInfo';
import ActionHUD from './ActionHUD';
import LocationHUD from './LocationHUD';
import Peripherals from './Peripherals';

export interface TurtleProps {
    action: Action;
}

function HUD(props: TurtleProps) {
    const {action} = props;
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const navigate = useNavigate();
    const {data: turtle} = useTurtle(serverId, id);

    if (turtle == null) return null;

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
                    pointerEvents: 'none',
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
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        margin: '5px auto 55px 10px',
                        cursor: 'pointer',
                        pointerEvents: 'all',
                    }}
                    onClick={() => {
                        navigate('/dashboard');
                    }}
                >
                    <span style={{fontSize: '1.8em', color: '#c6c6c6'}}>🠈</span>
                </div>
                <div
                    style={{
                        pointerEvents: 'all',
                    }}
                >
                    <Inventory action={action} />
                </div>
                <div
                    style={{
                        pointerEvents: 'all',
                    }}
                >
                    <Peripherals action={action} turtle={turtle} />
                </div>
            </div>
            <div
                style={{
                    position: 'fixed',
                    left: '50%',
                    bottom: 10,
                    transform: 'translateX(-50%)',
                    opacity: 0.8,
                    pointerEvents: 'all',
                }}
            >
                <ActionHUD action={action} />
            </div>
        </>
    );
}

export default HUD;
