import styled from 'styled-components';
import {Button} from 'react-bootstrap';
import {Action} from '../../../../App';
import {Peripheral, Turtle} from '../../../../api/UseTurtle';
import CreateFileModal from './CreateFileModal';
import {useState} from 'react';

export interface Props {
    turtle: Turtle;
    peripheral: Peripheral;
    action: Action;
}

function Drive(props: Props) {
    const {turtle, peripheral, action} = props;
    const {data} = peripheral;
    const [isCreateFileModalHidden, setIsCreateFileModalHidden] = useState(true);

    if (data == null) return null;

    const {hasData, mountPath, files} = data as {
        hasData: boolean;
        mountPath?: string;
        files?: string[] | null;
    };

    // Weird hack to fix issues with @react-three/drei
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Btn: any = Button;

    return (
        <>
            {hasData ? (
                <CreateFileModal
                    isHidden={isCreateFileModalHidden}
                    action={action}
                    hideModal={() => setIsCreateFileModalHidden(true)}
                    turtle={turtle}
                    drive={mountPath as string}
                />
            ) : null}
            <PeripheralContainer>
                {hasData ? (
                    <div>
                        <div>Drive is mounted as: &quot;{mountPath}&quot;</div>
                        <br />
                        <div>
                            <div>Files:</div>
                            {files == null ? (
                                <div>&lt;none&gt;</div>
                            ) : (
                                <ul>
                                    {files.map((file, i) => (
                                        <li key={i}>{file}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <br />
                        <div style={{display: 'flex', gap: 6, flexDirection: 'column'}}>
                            <Btn
                                onClick={() => setIsCreateFileModalHidden(false)}
                                variant='outline-info'
                                size='sm'
                                disabled={!turtle.isOnline}
                            >
                                Create file
                            </Btn>
                        </div>
                    </div>
                ) : (
                    <div>This drive is empty!</div>
                )}
            </PeripheralContainer>
        </>
    );
}

const PeripheralContainer = styled.div`
    display: flex;
    gap: 5px;
`;

export default Drive;
