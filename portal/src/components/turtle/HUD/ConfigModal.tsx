import {useState} from 'react';
import {Modal, Form, Button, InputGroup} from 'react-bootstrap';
import {Action} from '../../../App';
import {Turtle} from '../../../api/UseTurtle';

type Props = {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
};

function ConfigModal({action, turtle, hideModal}: Props) {
    const [state, setState] = useState({
        isFormValidated: false,
        location: {
            x: turtle?.location?.x,
            y: turtle?.location?.y,
            z: turtle?.location?.z,
        },
        direction: turtle?.direction,
        newName: turtle.name,
        home: {
            x: turtle?.home?.x ?? turtle?.location?.x,
            y: turtle?.home?.y ?? turtle?.location?.y,
            z: turtle?.home?.z ?? turtle?.location?.z,
        },
    });

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({
                type: 'ACTION',
                action: 'update-config',
                data: {
                    serverId: turtle.serverId,
                    id: turtle.id,
                    location: state.location,
                    direction: Number(state.direction),
                    newName: state.newName,
                    home: state.home,
                },
            });
            hideModal();
        } else {
            e.stopPropagation();
        }

        setState({
            ...state,
            isFormValidated: true,
        });
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <Form noValidate validated={state.isFormValidated} onSubmit={handleFormSubmit}>
            <Modal.Header closeButton>
                <Modal.Title>Configure Turtle</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className='mb-2'>
                    <Form.Label>Name</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type='text'
                            placeholder='Name'
                            value={state.newName}
                            required
                            onChange={(e) => setState({...state, newName: e.target.value})}
                        />
                    </InputGroup>
                    <Form.Control.Feedback type='invalid'>Please enter a valid name</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className='mb-2'>
                    <Form.Label>Location (x, y, z)</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type='number'
                            placeholder='X'
                            value={state.location.x}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    location: {
                                        ...state.location,
                                        x: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control
                            type='number'
                            placeholder='Y'
                            value={state.location.y}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    location: {
                                        ...state.location,
                                        y: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control
                            type='number'
                            placeholder='Z'
                            value={state.location.z}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    location: {
                                        ...state.location,
                                        z: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control.Feedback type='invalid'>Please enter valid numbers</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                <Form.Group className='mb-2'>
                    <Form.Label>Direction</Form.Label>
                    <InputGroup>
                        <Form.Control
                            value={state.direction}
                            onChange={(e) => setState({...state, direction: Number(e.target.value)})}
                            as='select'
                            required
                        >
                            <option value='' key='empty'>
                                -- select facing direction --
                            </option>
                            <option value='2' key=''>
                                (N)orth
                            </option>
                            <option value='3' key=''>
                                (E)ast
                            </option>
                            <option value='4' key=''>
                                (S)outh
                            </option>
                            <option value='1' key=''>
                                (W)est
                            </option>
                        </Form.Control>
                        <Form.Control.Feedback type='invalid'>
                            Please select a valid facing direction
                        </Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                <Form.Group className='mb-2'>
                    <Form.Label>Home (x, y, z)</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type='number'
                            placeholder='X'
                            value={state.home.x}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    home: {
                                        ...state.home,
                                        x: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control
                            type='number'
                            placeholder='Y'
                            value={state.home.y}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    home: {
                                        ...state.home,
                                        y: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control
                            type='number'
                            placeholder='Z'
                            value={state.home.z}
                            required
                            onChange={(e) =>
                                setState({
                                    ...state,
                                    home: {
                                        ...state.home,
                                        z: Number(e.target.value),
                                    },
                                })
                            }
                        />
                        <Form.Control.Feedback type='invalid'>Please enter valid numbers</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Btn variant='success' type='submit'>
                    Update
                </Btn>
            </Modal.Footer>
        </Form>
    );
}

export default ConfigModal;
