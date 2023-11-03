import {useState} from 'react';
import {Modal, Form, Button} from 'react-bootstrap';

function MineModal(props) {
    const [state, setState] = useState({
        isFormValidated: false,
        selectedOption: 'area',
        selectedArea: '',
        selectedYLevel: undefined,
        selectedDirection: '',
    });

    const handleFormSubmit = (e) => {
        e.preventDefault();

        let isFormValidated = true;
        let selectedArea = state.selectedArea;
        let selectedYLevel = state.selectedYLevel;
        let selectedDirection = state.selectedDirection;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            let target;
            switch (state.selectedOption) {
                case 'area':
                    target = selectedArea;
                    break;
                case 'ylevel':
                    target = selectedYLevel;
                    break;
                case 'direction':
                    target = selectedDirection;
                    break;
                default:
                    throw new Error('Invalid selected mining option');
            }

            props.action({
                type: 'ACTION',
                action: 'mine',
                data: {id: props.turtle.id, mineType: state.selectedOption, mineTarget: target},
            });
            selectedArea = '';
            selectedYLevel = '';
            selectedDirection = '';
            props.hideModal();
        } else {
            e.stopPropagation();
        }

        setState({isFormValidated, selectedArea, selectedYLevel, selectedDirection});
    };

    const renderFormInput = () => {
        switch (state.selectedOption) {
            case 'area':
                return (
                    <Form.Group>
                        <Form.Label>Mine area</Form.Label>
                        <Form.Control
                            value={state.selectedArea}
                            onChange={(e) => setState({selectedArea: e.target.value})}
                            as='select'
                            required
                        >
                            <option value='' key='empty'>
                                -- select an area to mine --
                            </option>
                            {Object.keys(props.areas).map((key) => (
                                <option key={key}>{props.areas[key]}</option>
                            ))}
                        </Form.Control>
                        <Form.Control.Feedback type='invalid'>Please select a valid area</Form.Control.Feedback>
                    </Form.Group>
                );
            case 'ylevel':
                return (
                    <Form.Group>
                        <Form.Label>Mine to Y-Level</Form.Label>
                        <Form.Control
                            type='number'
                            min='1'
                            max='255'
                            placeholder={props.turtle.location.y}
                            value={state.selectedYLevel}
                            onChange={(e) => setState({selectedYLevel: e.target.value})}
                        />
                        <Form.Control.Feedback type='invalid'>Please select a valid y-level</Form.Control.Feedback>
                    </Form.Group>
                );
            case 'direction':
                return (
                    <Form.Group>
                        <Form.Label>Mine in direction</Form.Label>
                        <Form.Control
                            value={state.selectedDirection}
                            onChange={(e) => setState({selectedDirection: e.target.value})}
                            as='select'
                            required
                        >
                            <option value='' key='empty'>
                                -- select a direction to mine --
                            </option>
                            <option key='Up'>Up</option>
                            <option key='Down'>Down</option>
                            <option key='North'>North</option>
                            <option key='East'>East</option>
                            <option key='South'>South</option>
                            <option key='West'>West</option>
                        </Form.Control>
                        <Form.Control.Feedback type='invalid'>Please select a valid direction</Form.Control.Feedback>
                    </Form.Group>
                );
            default:
                return undefined;
        }
    };

    return (
        <Form noValidate validated={state.isFormValidated} onSubmit={handleFormSubmit}>
            <Modal.Header closeButton>
                <Modal.Title>Mine</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group>
                    <Form.Label>Mining type</Form.Label>
                    <div>
                        <Form.Check
                            inline
                            name='miningType'
                            label='Area'
                            type='radio'
                            id='area'
                            value='area'
                            checked={state.selectedOption === 'area'}
                            onChange={() => setState({selectedOption: 'area'})}
                        />
                        <Form.Check
                            inline
                            name='miningType'
                            label='Y-Level'
                            type='radio'
                            id='ylevel'
                            value='ylevel'
                            checked={state.selectedOption === 'ylevel'}
                            onChange={() => setState({selectedOption: 'ylevel'})}
                        />
                        <Form.Check
                            inline
                            name='miningType'
                            label='Direction'
                            type='radio'
                            id='direction'
                            value='direction'
                            checked={state.selectedOption === 'direction'}
                            onChange={() => setState({selectedOption: 'direction'})}
                        />
                    </div>
                </Form.Group>
                {renderFormInput()}
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
