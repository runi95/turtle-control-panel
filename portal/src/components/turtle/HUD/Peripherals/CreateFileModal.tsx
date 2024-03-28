import {useState} from 'react';
import {Modal, Form, Button, Row, Col} from 'react-bootstrap';
import {useParams} from 'react-router-dom';
import {Turtle} from '../../../../api/UseTurtle';
import {Action} from '../../../../App';

type Props = {
    isHidden: boolean;
    turtle: Turtle;
    drive: string;
    action: Action;
    hideModal: () => void;
};

function CreateFileModal({isHidden, drive, turtle, action, hideModal}: Props) {
    const {serverId} = useParams() as {serverId: string};
    const [isFormValidated, setIsFormValidated] = useState(false);
    const [fileName, setFileName] = useState<string>(null!);
    const [fileContent, setFileContent] = useState<string>(null!);

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        if (form.checkValidity() === true) {
            action({
                type: 'ACTION',
                action: 'drive-create-file',
                data: {
                    serverId,
                    id: turtle.id,
                    file: `${drive}/${fileName}`,
                    content: fileContent,
                },
            });
            hideModal();
            setIsFormValidated(false);
        } else {
            e.stopPropagation();
        }

        setIsFormValidated(true);
    };

    return (
        <Modal
            show={!isHidden}
            onHide={() => {
                hideModal();
                setIsFormValidated(false);
            }}
        >
            <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Create directory</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={2} column>
                            name
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={10}>
                            <Form.Control
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                type='text'
                                required
                            />
                        </Col>
                    </Row>
                    <Row className='mb-3'>
                        <Form.Label className='me-0 pe-0' sm={2} column>
                            content
                        </Form.Label>
                        <Col className='ms-0 ps-0' sm={10}>
                            <Form.Control
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                as='textarea'
                                rows={6}
                                required
                            />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Btn variant='outline-success' type='submit'>
                        Create
                    </Btn>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default CreateFileModal;
