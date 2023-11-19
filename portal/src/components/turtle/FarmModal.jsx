import {useState} from 'react';
import {Modal, Form, Button, InputGroup} from 'react-bootstrap';

function FarmModal(props) {
    const [state, setState] = useState({
        isFormValidated: false,
        selectedArea: '',
    });

    const handleFormSubmit = (e) => {
        e.preventDefault();

        let isFormValidated = true;
        let selectedArea = state.selectedArea;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            props.action({type: 'ACTION', action: 'farm', data: {id: props.turtle.id, areaId: selectedArea}});
            selectedArea = '';
            props.hideModal();
        } else {
            e.stopPropagation();
        }

        setState({...state, isFormValidated, selectedArea});
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
                            custom
                            required
                        >
                            <option value='' key='empty'>
                                -- select an area to farm --
                            </option>
                            {Object.keys(props.areas).map((key) => (
                                <option key={key}>{props.areas[key]}</option>
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
