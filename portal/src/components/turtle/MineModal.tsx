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
        selectedOption: string;
        selectedArea: string;
        selectedYLevel: number | undefined;
        selectedDirection: string;
    }>({
        isFormValidated: false,
        selectedOption: 'area',
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
            selectedYLevel = undefined;
            selectedDirection = '';
            props.hideModal();
        } else {
            e.stopPropagation();
        }

        setState({...state, isFormValidated: true, selectedArea, selectedYLevel, selectedDirection});
    };

    const renderFormInput = () => {
        switch (state.selectedOption) {
            case 'area':
                return (
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
                );
            case 'ylevel':
                return (
                    <Form.Group className='mb-2'>
                        <Form.Label>Mine to Y-Level</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type='number'
                                min='1'
                                max='255'
                                placeholder={props.turtle.location.y.toString()}
                                value={state.selectedYLevel}
                                onChange={(e) => setState({...state, selectedYLevel: Number(e.target.value)})}
                            />
                            <Form.Control.Feedback type='invalid'>Please select a valid y-level</Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>
                );
            case 'direction':
                return (
                    <Form.Group className='mb-2'>
                        <Form.Label>Mine in direction</Form.Label>
                        <InputGroup>
                            <Form.Control
                                value={state.selectedDirection}
                                onChange={(e) => setState({...state, selectedDirection: e.target.value})}
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
                            <Form.Control.Feedback type='invalid'>
                                Please select a valid direction
                            </Form.Control.Feedback>
                        </InputGroup>
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
                <Form.Group className='mb-2'>
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
                            onChange={() => setState({...state, selectedOption: 'area'})}
                        />
                        <Form.Check
                            inline
                            name='miningType'
                            label='Y-Level'
                            type='radio'
                            id='ylevel'
                            value='ylevel'
                            checked={state.selectedOption === 'ylevel'}
                            onChange={() => setState({...state, selectedOption: 'ylevel'})}
                        />
                        <Form.Check
                            inline
                            name='miningType'
                            label='Direction'
                            type='radio'
                            id='direction'
                            value='direction'
                            checked={state.selectedOption === 'direction'}
                            onChange={() => setState({...state, selectedOption: 'direction'})}
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
