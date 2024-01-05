import {useState} from 'react';
import {Modal, Form, Button, InputGroup} from 'react-bootstrap';
import {Action} from '../../App';
import {useAreas} from '../../api/UseAreas';
import {useParams} from 'react-router-dom';
import {Turtle} from '../../api/UseTurtle';

export interface FarmModalProps {
    action: Action;
    turtle: Turtle;
    hideModal: () => void;
}

function FarmModal(props: FarmModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const {action, hideModal} = props;
    const [state, setState] = useState({
        isFormValidated: false,
        selectedArea: '',
    });

    const {data: areas} = useAreas(serverId);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let selectedArea = state.selectedArea;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({type: 'ACTION', action: 'farm', data: {serverId, id: props.turtle.id, areaId: selectedArea}});
            selectedArea = '';
            hideModal();
        } else {
            e.stopPropagation();
        }

        setState({...state, isFormValidated: true, selectedArea});
    };

    if (areas === undefined) return null;

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
                            {Object.keys(areas).map((key) => (
                                <option key={key} value={areas[key].id}>
                                    {areas[key].name}
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

export default FarmModal;
