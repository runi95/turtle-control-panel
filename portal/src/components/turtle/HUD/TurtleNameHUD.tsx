import {useParams} from 'react-router-dom';
import {useTurtle} from '../../../api/UseTurtle';
import {useState} from 'react';
import {Button, Form, InputGroup} from 'react-bootstrap';
import {useWebSocket} from '../../../api/UseWebSocket';

function TurtleNameHUD() {
    const {serverId, id} = useParams() as {serverId: string; id: string};
    const {action} = useWebSocket();
    const [editNameState, setEditNameState] = useState(false);

    const {data: turtle} = useTurtle(serverId, id);
    if (turtle === undefined) return null;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <div style={{display: 'flex'}}>
            {editNameState ? (
                <Form
                    style={{marginBottom: '.5rem'}}
                    onSubmit={(e) => {
                        e.preventDefault();
                        action({
                            type: 'ACTION',
                            action: 'rename',
                            data: {
                                serverId,
                                id,
                                newName: ((e.target as HTMLFormElement)[0] as HTMLInputElement).value,
                            },
                        });
                        setEditNameState(false);
                    }}
                >
                    <InputGroup>
                        <Form.Control name='name' type='text' size='sm' defaultValue={turtle.name} autoFocus />
                        <Btn
                            style={{border: 'none'}}
                            variant='outline-danger'
                            onClick={() => {
                                setEditNameState(false);
                            }}
                        >
                            ✖
                        </Btn>
                        <Btn style={{border: 'none'}} type='submit' variant='outline-success'>
                            ✔
                        </Btn>
                    </InputGroup>
                </Form>
            ) : (
                <div style={{display: 'flex'}}>
                    <h5
                        style={{
                            cursor: 'pointer',
                        }}
                        onClick={() => {
                            setEditNameState(true);
                        }}
                    >
                        {turtle?.name ?? 'Unknown Turtle'}
                    </h5>
                </div>
            )}
        </div>
    );
}

export default TurtleNameHUD;
