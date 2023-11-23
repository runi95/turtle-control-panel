import styled from 'styled-components';
import {Spinner} from 'react-bootstrap';

export interface LandingPageProps {
    shouldFadeOut: boolean;
    isLoading: boolean;
    isConnected: boolean;
    message: string;
}

function LandingPage(props: LandingPageProps) {
    return (
        <Centered className={props.shouldFadeOut ? 'fade-out' : undefined}>
            <img height='192' width='192' src='/logo.svg' alt='Logo' />
            <h1>Turtle Control Panel</h1>
            {props.isLoading ? (
                <Spinner style={{width: '3.5rem', height: '3.5rem'}} animation='border' variant='light' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                </Spinner>
            ) : (
                <h5 className={props.isConnected ? 'text-success' : 'text-danger'}>{props.message}</h5>
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
