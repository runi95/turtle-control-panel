import {useState} from 'react';
import {Modal, Form, Button, InputGroup} from 'react-bootstrap';
import {Action, Areas, Turtle} from '../../App';

export interface MineModalProps {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
    areas: Areas;
}

function MineModal(props: MineModalProps) {
    const [state, setState] = useState<{
        isFormValidated: boolean;
        selectedArea: string;
        selectedYLevel: number | undefined;
        selectedDirection: string;
    }>({
        isFormValidated: false,
        selectedArea: '',
        selectedYLevel: undefined,
        selectedDirection: '',
    });

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let selectedArea = state.selectedArea;
        let selectedYLevel = state.selectedYLevel;
        let selectedDirection = state.selectedDirection;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            props.action({
                type: 'ACTION',
                action: 'mine',
                data: {id: props.turtle.id, mineTarget: selectedArea},
            });
            selectedArea = '';
            selectedYLevel = undefined;
            selectedDirection = '';
            props.hideModal();
        } else {
            e.stopPropagation();
        }

        setState({...state, isFormValidated: true, selectedArea, selectedYLevel, selectedDirection});
    };

    return (
        <Form noValidate validated={state.isFormValidated} onSubmit={handleFormSubmit}>
            <Modal.Header closeButton>
                <Modal.Title>Mine</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className='mb-2'>
                    <Form.Label>Mine area</Form.Label>
                    <InputGroup>
                        <Form.Control
                            value={state.selectedArea}
                            onChange={(e) => setState({...state, selectedArea: e.target.value})}
                            as='select'
                            required
                        >
                            <option value='' key='empty'>
                                -- select an area to mine --
                            </option>
                            {Object.keys(props.areas).map((key) => (
                                <option key={key} value={props.areas[key].id}>
                                    {props.areas[key].name}
                                </option>
                            ))}
                        </Form.Control>
                        <Form.Control.Feedback type='invalid'>Please select a valid area</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant='success' type='submit'>
                    Start
                </Button>
            </Modal.Footer>
        </Form>
    );
}

export default MineModal;
