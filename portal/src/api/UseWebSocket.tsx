import {ReactNode, createContext, useContext, useEffect, useState} from 'react';
import io, {Socket} from 'socket.io-client';
import {wssServerUrl} from '.';
import {Action, ActionMessage} from '../App';

type Context = {
    socket: Socket;
    action: Action;
};

const WebSocketContext = createContext<Context>(null!);

export enum ConnectionStatus {
    UNINITIALIZED,
    CONNECTING,
    CONNECTED,
    CONNECTION_FAILED,
    DISCONNECTED,
}

const WebSocketConnectionContext = createContext<ConnectionStatus>(null!);

type Props = {
    children: ReactNode;
};

export const WebSocketProvider = ({children}: Props) => {
    const [socket, setSocket] = useState<Socket>(null!);
    const [status, setStatus] = useState(ConnectionStatus.UNINITIALIZED);

    useEffect(() => {
        // Initialize WebSocket connection
        const socketIo = io(wssServerUrl, {
            transports: ['websocket'],
        });

        setStatus(ConnectionStatus.CONNECTING);
        setSocket(socketIo);

        function onConnect() {
            setStatus(ConnectionStatus.CONNECTED);
        }

        function onConnectError() {
            setStatus(ConnectionStatus.CONNECTION_FAILED);
        }

        function onReconnectAttempt() {
            setStatus(ConnectionStatus.CONNECTING);
        }

        function onDisconnect() {
            setStatus(ConnectionStatus.DISCONNECTED);
        }

        socketIo.on('connect', onConnect);
        socketIo.on('connect_error', onConnectError);
        socketIo.io.on('reconnect_attempt', onReconnectAttempt);
        socketIo.on('disconnect', onDisconnect);

        return () => {
            socketIo.off('connect', onConnect);
            socketIo.off('connect_error', onConnectError);
            socketIo.io.off('reconnect_attempt', onReconnectAttempt);
            socketIo.off('disconnect', onDisconnect);
            socketIo.disconnect();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{socket, action: (msg: ActionMessage) => socket.send(msg)}}>
            <WebSocketConnectionContext.Provider value={status}>{children}</WebSocketConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
};

// Custom hook to use WebSocket
export const useWebSocket = () => useContext(WebSocketContext);

export const useWebSocketConnectionStatus = () => useContext(WebSocketConnectionContext);
