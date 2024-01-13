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
    const [state, setState] = useState<{
        isFormValidated: boolean;
        selectedArea: string;
        selectedYLevel: number | undefined;
        selectedDirection: string;
    }>({
        isFormValidated: false,
        selectedArea: '',
        selectedYLevel: undefined,
        selectedDirection: '',
    });
    const {data: areas} = useAreas(serverId);

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        let selectedArea = state.selectedArea;
        let selectedYLevel = state.selectedYLevel;
        let selectedDirection = state.selectedDirection;
        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            props.action({
                type: 'ACTION',
                action: 'mine',
                data: {serverId, id: props.turtle.id, mineTarget: selectedArea},
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

    if (areas === undefined) return null;

    return (
        <Form noValidate validated={state.isFormValidated} onSubmit={handleFormSubmit}>
            <Modal.Header closeButton>
                <Modal.Title>Mine</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <MineArea />
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
