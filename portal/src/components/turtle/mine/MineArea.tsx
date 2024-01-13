import {useState, useEffect} from 'react';
import {Form, InputGroup} from 'react-bootstrap';
import {useAreas} from '../../../api/UseAreas';
import {useParams} from 'react-router-dom';

interface MineAreaProps {
    formData: {
        [key: string]: unknown;
    };
    setFormData: (formData: {mineTarget: string}) => void;
}

function MineArea(props: MineAreaProps) {
    const {serverId} = useParams() as {serverId: string};
    const {formData, setFormData} = props;
    const [mineTarget, setMineTarget] = useState('');
    const {data: areas} = useAreas(serverId);
    useEffect(() => {
        const formMineTarget = formData?.mineTarget as string | undefined;
        if (formMineTarget) {
            setMineTarget(formMineTarget);
        } else {
            setMineTarget('');
        }
    }, [formData]);

    if (areas === undefined) return null;

    return (
        <Form.Group className='mb-2'>
            <Form.Label>Mine area</Form.Label>
            <InputGroup>
                <Form.Control
                    value={mineTarget}
                    onChange={(e) => setFormData({mineTarget: e.target.value})}
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
