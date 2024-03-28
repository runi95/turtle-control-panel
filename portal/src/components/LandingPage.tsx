import styled from 'styled-components';
import {Spinner} from 'react-bootstrap';
import {ConnectionStatus, useWebSocketConnectionStatus} from '../api/UseWebSocket';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

function LandingPage() {
    const navigate = useNavigate();
    const connectionStatus = useWebSocketConnectionStatus();
    const [message, setMessage] = useState('');

    useEffect(() => {
        switch (connectionStatus) {
            case ConnectionStatus.CONNECTED:
                setMessage('Connected...');
                setTimeout(() => {
                    if (location.pathname === '/') {
                        navigate('/dashboard');
                    }
                }, 2500);
                break;
            case ConnectionStatus.CONNECTION_FAILED:
                setMessage('Failed to connect');
        }
    }, [connectionStatus]);

    return (
        <Centered className={connectionStatus === ConnectionStatus.CONNECTED ? 'fade-out' : undefined}>
            <img height='192' width='192' src='/logo.svg' alt='Logo' />
            <h1>Turtle Control Panel</h1>
            {connectionStatus === ConnectionStatus.CONNECTING ? (
                <Spinner style={{width: '3.5rem', height: '3.5rem'}} animation='border' variant='light' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                </Spinner>
            ) : (
                <h5 className={connectionStatus === ConnectionStatus.CONNECTED ? 'text-success' : 'text-danger'}>
                    {message}
                </h5>
            )}
        </Centered>
    );
}

const Centered = styled.div`
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    width: 100%;
    height: 100%;
`;

export default LandingPage;
