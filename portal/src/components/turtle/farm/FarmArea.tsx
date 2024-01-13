import {useState} from 'react';
import {Form, InputGroup} from 'react-bootstrap';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';

function FarmArea() {
    const {serverId} = useParams() as {serverId: string};
    const [state, setState] = useState({
        isFormValidated: false,
        selectedArea: '',
    });

    const {data: areas} = useAreas(serverId);

    if (areas === undefined) return null;

    return (
        <Form.Group className='mb-2'>
            <Form.Label>Farming area</Form.Label>
            <InputGroup>
                <Form.Control
                    value={state.selectedArea}
                    onChange={(e) => setState({...state, selectedArea: e.target.value})}
                    as='select'
                    required
                >
                    <option value='' key='empty'>
                        -- select an area to farm --
                    </option>
                    {Object.keys(areas).map((key) => (
                        <option key={key} value={areas[key].id}>
                            {areas[key].name}
                        </option>
                    ))}
                </Form.Control>
                <Form.Control.Feedback type='invalid'>Please select a valid area</Form.Control.Feedback>
            </InputGroup>
        </Form.Group>
    );
}

export default FarmArea;
