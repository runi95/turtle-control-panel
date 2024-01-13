import {useState, useEffect} from 'react';
import {Form, InputGroup} from 'react-bootstrap';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';

interface FarmAreaProps {
    formData: {
        [key: string]: unknown;
    };
    setFormData: (formData: {areaId: string}) => void;
}

function FarmArea(props: FarmAreaProps) {
    const {serverId} = useParams() as {serverId: string};
    const {formData, setFormData} = props;
    const [areaId, setAreaId] = useState('');
    const {data: areas} = useAreas(serverId);
    useEffect(() => {
        const formAreaId = formData?.areaId as string | undefined;
        if (formAreaId) {
            setAreaId(formAreaId);
        } else {
            setAreaId('');
        }
    }, [formData]);

    if (areas === undefined) return null;

    return (
        <Form.Group className='mb-2'>
            <Form.Label>Farming area</Form.Label>
            <InputGroup>
                <Form.Control
                    value={areaId}
                    onChange={(e) => setFormData({areaId: e.target.value})}
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
