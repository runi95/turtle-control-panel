import {useState} from 'react';
import {Modal, Form, Button, InputGroup} from 'react-bootstrap';
import {Action, Turtle} from '../../App';

export interface FarmModalProps {
    action: Action;
    turtle: Turtle;
    areas: number[];
    hideModal: () => void;
}

function FarmModal(props: FarmModalProps) {
    const {action, hideModal} = props;
    const [state, setState] = useState({
        isFormValidated: false,
        selectedArea: '',
    });

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let selectedArea = state.selectedArea;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({type: 'ACTION', action: 'farm', data: {id: props.turtle.id, areaId: selectedArea}});
            selectedArea = '';
            hideModal();
        } else {
            e.stopPropagation();
        }

        setState({...state, isFormValidated: true, selectedArea});
    };

    return (
        <Form noValidate validated={state.isFormValidated} onSubmit={handleFormSubmit}>
            <Modal.Header closeButton>
                <Modal.Title>Farm</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className='mb-2'>
                    <Form.Label>Farming area</Form.Label>
                    <InputGroup>
                        <Form.Control
                            value={state.selectedArea}
                            onChange={(e) => setState({...state, selectedArea: e.target.value})}
                            as='select'
                            required
                        >
                            <option value='' key='empty'>
                                -- select an area to farm --
                            </option>
                            {Object.keys(props.areas).map((key) => (
                                <option key={key}>{props.areas[Number(key)]}</option>
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

export default FarmModal;
