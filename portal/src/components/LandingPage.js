import { Component } from 'react';
import styled from 'styled-components';
import { Spinner } from 'react-bootstrap';

class LandingPage extends Component {
    render() {
        return (
            <Centered className={this.props.shouldFadeOut && 'fade-out'}>
                <img height="192" width="192" src="/logo.svg" alt="Logo" />
                <h1>Turtle Control Panel</h1>
                {this.props.isLoading ? (
                    <Spinner style={{ width: '3.5rem', height: '3.5rem' }} animation="border" variant="light" role="status">
                        <span className="sr-only">Loading...</span>
                    </Spinner>
                ) : (
                    <h5 className={this.props.isConnected ? 'text-success' : 'text-danger'}>{this.props.message}</h5>
                )}
            </Centered>
        );
    }
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
