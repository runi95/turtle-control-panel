import React, { Component } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

class FarmModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isFormValidated: false,
            selectedArea: '',
        };

        this.handleFormSubmit = this.handleFormSubmit.bind(this);
    }

    handleFormSubmit(e) {
        e.preventDefault();

        let isFormValidated = true;
        let selectedArea = this.state.selectedArea;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            this.props.action({ type: 'ACTION', action: 'farm', data: { id: this.props.turtle.id, areaId: selectedArea } });
            selectedArea = '';
            this.props.hideModal();
        } else {
            e.stopPropagation();
        }

        this.setState({ isFormValidated, selectedArea });
    }

    render() {
        return (
            <Form noValidate validated={this.state.isFormValidated} onSubmit={this.handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Farm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Farming area</Form.Label>
                        <Form.Control
                            value={this.state.selectedArea}
                            onChange={(e) => this.setState({ selectedArea: e.target.value })}
                            as="select"
                            custom
                            required
                        >
                            <option value="" key="empty">
                                -- select an area to farm --
                            </option>
                            {Object.keys(this.props.areas).map((key) => (
                                <option key={key}>{this.props.areas[key]}</option>
                            ))}
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">Please select a valid area</Form.Control.Feedback>
                    </Form.Group>
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

export default FarmModal;
