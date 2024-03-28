import {useState} from 'react';
import {Modal, Form, Button} from 'react-bootstrap';
import {Action} from '../../../App';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';
import {Turtle} from '../../../api/UseTurtle';
import FarmArea from './FarmArea';

export interface FarmModalProps {
    action: Action;
    turtle: Turtle;
    hideModal: () => void;
}

function FarmModal(props: FarmModalProps) {
    const {serverId} = useParams() as {serverId: string};
    const {action, hideModal} = props;
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [formData, setFormData] = useState({} as {[key: string]: unknown});

    const {data: areas} = useAreas(serverId);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({type: 'ACTION', action: 'farm', data: {...formData, serverId, id: props.turtle.id}});
            hideModal();
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    if (areas === undefined) return null;

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <Modal show={true} onHide={() => hideModal()}>
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Farm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FarmArea formData={formData} setFormData={setFormData} />
                </Modal.Body>
                <Modal.Footer>
                    <Btn variant='success' type='submit'>
                        Start
                    </Btn>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default FarmModal;
