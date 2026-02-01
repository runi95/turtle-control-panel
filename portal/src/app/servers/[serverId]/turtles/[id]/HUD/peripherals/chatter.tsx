"use client";

import styled from "styled-components";
import { Button, Form, InputGroup } from "react-bootstrap";
import { Peripheral, Turtle } from "../../../../../../hooks/useTurtle";
import { useState } from "react";
import { Action } from "../../../../../../types/action";

export interface Props {
  turtle: Turtle;
  side: string;
  peripheral: Peripheral;
  action: Action;
}

function Chatter(props: Props) {
  const [state, setState] = useState({
    isFormValidated: false,
    message: "",
  });
  const { turtle, side, peripheral, action } = props;
  const { data } = peripheral;

  if (data == null) return null;

  const { message } = data as {
    message?: string;
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === true) {
      action({
        type: "ACTION",
        action: "chatter-set-message",
        data: {
          serverId: turtle.serverId,
          id: turtle.id,
          side,
          message: state.message,
        },
      });
    } else {
      e.stopPropagation();
    }

    setState({
      ...state,
      isFormValidated: true,
    });
  };

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  return (
    <Form noValidate onSubmit={handleFormSubmit}>
      <PeripheralContainer>
        <div>
          <div>Currently displaying:</div>
          <MessageContainer>&gt; {message}</MessageContainer>
        </div>
        <Form.Group className="mb-2">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Display message"
              value={state.message}
              required
              onChange={(e) => setState({ ...state, message: e.target.value })}
            />
          </InputGroup>
          <Form.Control.Feedback type="invalid">
            Please enter a valid message
          </Form.Control.Feedback>
        </Form.Group>
        <InnerContainer>
          <Btn
            onClick={() =>
              action({
                type: "ACTION",
                action: "chatter-clear-message",
                data: {
                  serverId: turtle.serverId,
                  id: turtle.id,
                  side,
                },
              })
            }
            variant="outline-danger"
            size="sm"
            disabled={!turtle.isOnline}
          >
            Clear
          </Btn>
          <Btn
            variant="outline-info"
            size="sm"
            disabled={!turtle.isOnline}
            type="submit"
          >
            Send message
          </Btn>
        </InnerContainer>
      </PeripheralContainer>
    </Form>
  );
}

const PeripheralContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const MessageContainer = styled.div`
  overflow-wrap: break-word;
  color: white;
  background: rgb(39, 41, 61);
  max-width: 250px;
  min-height: 1.5em;
  padding: 5px;
`;

const InnerContainer = styled.div`
  display: flex;
  gap: 5px;
`;

export default Chatter;
