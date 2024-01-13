import {useState} from 'react';
import {Form, InputGroup} from 'react-bootstrap';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';

function MineArea() {
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

    if (areas === undefined) return null;

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

export default MineArea;
