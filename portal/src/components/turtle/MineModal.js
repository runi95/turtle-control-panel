import React, { Component } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

class MineModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isFormValidated: false,
            selectedOption: 'area',
            selectedArea: '',
            selectedYLevel: undefined,
            selectedDirection: '',
        };

        this.handleFormSubmit = this.handleFormSubmit.bind(this);
    }

    handleFormSubmit(e) {
        e.preventDefault();

        let isFormValidated = true;
        let selectedArea = this.state.selectedArea;
        let selectedYLevel = this.state.selectedYLevel;
        let selectedDirection = this.state.selectedDirection;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            let target;
            switch (this.state.selectedOption) {
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

            this.props.action({
                type: 'ACTION',
                action: 'mine',
                data: { id: this.props.turtle.id, mineType: this.state.selectedOption, mineTarget: target },
            });
            selectedArea = '';
            selectedYLevel = '';
            selectedDirection = '';
            this.props.hideModal();
        } else {
            e.stopPropagation();
        }

        this.setState({ isFormValidated, selectedArea, selectedYLevel, selectedDirection });
    }

    renderFormInput() {
        switch (this.state.selectedOption) {
            case 'area':
                return (
                    <Form.Group>
                        <Form.Label>Mine area</Form.Label>
                        <Form.Control
                            value={this.state.selectedArea}
                            onChange={(e) => this.setState({ selectedArea: e.target.value })}
                            as="select"
                            custom
                            required
                        >
                            <option value="" key="empty">
                                -- select an area to mine --
                            </option>
                            {Object.keys(this.props.areas).map((key) => (
                                <option key={key}>{this.props.areas[key]}</option>
                            ))}
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">Please select a valid area</Form.Control.Feedback>
                    </Form.Group>
                );
            case 'ylevel':
                return (
                    <Form.Group>
                        <Form.Label>Mine to Y-Level</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            max="255"
                            placeholder={this.props.turtle.location.y}
                            value={this.state.selectedYLevel}
                            onChange={(e) => this.setState({ selectedYLevel: e.target.value })}
                        />
                        <Form.Control.Feedback type="invalid">Please select a valid y-level</Form.Control.Feedback>
                    </Form.Group>
                );
            case 'direction':
                return (
                    <Form.Group>
                        <Form.Label>Mine in direction</Form.Label>
                        <Form.Control
                            value={this.state.selectedDirection}
                            onChange={(e) => this.setState({ selectedDirection: e.target.value })}
                            as="select"
                            custom
                            required
                        >
                            <option value="" key="empty">
                                -- select a direction to mine --
                            </option>
                            <option key="Up">Up</option>
                            <option key="Down">Down</option>
                            <option key="North">North</option>
                            <option key="East">East</option>
                            <option key="South">South</option>
                            <option key="West">West</option>
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">Please select a valid direction</Form.Control.Feedback>
                    </Form.Group>
                );
            default:
                return undefined;
        }
    }

    render() {
        return (
            <Form noValidate validated={this.state.isFormValidated} onSubmit={this.handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Mine</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Mining type</Form.Label>
                        <div>
                            <Form.Check
                                inline
                                name="miningType"
                                label="Area"
                                type="radio"
                                id="area"
                                value="area"
                                checked={this.state.selectedOption === 'area'}
                                onChange={() => this.setState({ selectedOption: 'area' })}
                            />
                            <Form.Check
                                inline
                                name="miningType"
                                label="Y-Level"
                                type="radio"
                                id="ylevel"
                                value="ylevel"
                                checked={this.state.selectedOption === 'ylevel'}
                                onChange={() => this.setState({ selectedOption: 'ylevel' })}
                            />
                            <Form.Check
                                inline
                                name="miningType"
                                label="Direction"
                                type="radio"
                                id="direction"
                                value="direction"
                                checked={this.state.selectedOption === 'direction'}
                                onChange={() => this.setState({ selectedOption: 'direction' })}
                            />
                        </div>
                    </Form.Group>
                    {this.renderFormInput()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" type="submit">
                        Start
                    </Button>
                </Modal.Footer>
            </Form>
        );
    }
}

export default MineModal;
