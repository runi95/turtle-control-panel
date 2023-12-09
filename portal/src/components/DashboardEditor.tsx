import './Dashboard.css';
import {Action, Servers} from '../App';
import {Button, Col, Container, Form, InputGroup, Row} from 'react-bootstrap';
import {useState} from 'react';

export interface DashboardEditorProps {
    servers: Servers;
    action: Action;
    closeEditMode: () => void;
}

function DashboardEditor(props: DashboardEditorProps) {
    const {servers, action, closeEditMode} = props;
    const [formData, setFormData] = useState(
        Object.values(servers).reduce(
            (acc, curr) => ((acc[curr.id.toString()] = curr.name), acc),
            {} as {[key: string]: string | undefined}
        )
    );

    return (
        <Container fluid>
            <Row className='mt-3'>
                <Col>
                    <Form
                        style={{marginBottom: '.5rem'}}
                        onSubmit={(e) => {
                            e.preventDefault();
                            Object.keys(formData).forEach((key) => {
                                action({
                                    type: 'SERVER',
                                    action: 'rename',
                                    data: {
                                        id: key,
                                        newName: formData[key],
                                    },
                                });
                            });
                            closeEditMode();
                        }}
                    >
                        {Object.values(servers).map((server) => (
                            <Form.Group className='mb-2' key={server.id}>
                                <InputGroup>
                                    <InputGroup.Text id='name-label'>{server.remoteAddress}</InputGroup.Text>
                                    <Form.Control
                                        name='name'
                                        type='text'
                                        size='sm'
                                        aria-describeby='name-label'
                                        placeholder='Custom name'
                                        value={formData[server.id]}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                [server.id]: e.target.value,
                                            })
                                        }
                                    />
                                </InputGroup>
                            </Form.Group>
                        ))}
                        <InputGroup>
                            <Button
                                variant='outline-secondary'
                                size='sm'
                                onClick={() => {
                                    closeEditMode();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button variant='outline-success' size='sm' type='submit'>
                                Update
                            </Button>
                        </InputGroup>
                    </Form>
                </Col>
            </Row>
        </Container>
    );
}

export default DashboardEditor;