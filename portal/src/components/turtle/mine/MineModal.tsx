import {useState} from 'react';
import {Modal, Form, Button} from 'react-bootstrap';
import {Action} from '../../../App';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';
import {Turtle} from '../../../api/UseTurtle';
import MineArea from './MineArea';

export interface MineModalProps {
    turtle: Turtle;
    action: Action;
    hideModal: () => void;
}

function MineModal(props: MineModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const {turtle, action, hideModal} = props;
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [formData, setFormData] = useState({} as {[key: string]: unknown});
    const {data: areas} = useAreas(serverId);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({
                type: 'ACTION',
                action: 'mine',
                data: {...formData, serverId, id: turtle.id},
            });
            hideModal();
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    if (areas === undefined) return null;

    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Mine</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <MineArea formData={formData} setFormData={setFormData} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant='success' type='submit'>
                        Start
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default MineModal;
