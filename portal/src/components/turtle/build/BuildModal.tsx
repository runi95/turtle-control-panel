import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import {BlockNames} from '../mine/MinecraftBlockNames';
import './BuildModal.css';
import ItemSprite from '../HUD/Inventory/ItemSprite';

type Props = {
    hideModal: () => void;
    onSubmit: (type: string) => void;
};

function BuildModal({hideModal, onSubmit}: Props) {
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [buildingBlock, setBuildingBlock] = useState('minecraft:cobblestone');

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            onSubmit(buildingBlock);
            hideModal();
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Building</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={5} column>
                            The turtle should place down
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={6}>
                            <Form.Control
                                value={buildingBlock}
                                type='text'
                                list='blocks'
                                onChange={(e) => setBuildingBlock(e.target.value)}
                                required
                            />
                            <datalist id='blocks'>
                                {BlockNames.map((name, i) => (
                                    <option key={i}>{name}</option>
                                ))}
                            </datalist>
                        </Col>
                        <Col className='ms-0 ps-0' sm={1}>
                            <ItemSprite name={buildingBlock} />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Btn variant='outline-success' type='submit'>
                        Change
                    </Btn>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default BuildModal;
