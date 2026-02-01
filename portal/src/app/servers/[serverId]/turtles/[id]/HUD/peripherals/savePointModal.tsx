"use client";

import { useState } from "react";
import { Modal, Form, Button, Row, Col } from "react-bootstrap";
import { Turtle } from "../../../../../../hooks/useTurtle";
import { useParams } from "next/navigation";
import { Action } from "../../../../../../types/action";

type Props = {
  isHidden: boolean;
  turtle: Turtle;
  side: string;
  x: number;
  y: number;
  z: number;
  action: Action;
  hideModal: () => void;
};

function SavePointModal({
  isHidden,
  turtle,
  side,
  x,
  y,
  z,
  action,
  hideModal,
}: Props) {
  const { serverId } = useParams<{ serverId: string }>();
  const [isFormValidated, setIsFormValidated] = useState(false);
  const [pointName, setPointName] = useState<string>(null!);

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === true) {
      action({
        type: "ACTION",
        action: "end-automata-save-point",
        data: {
          serverId,
          id: turtle.id,
          side,
          point: `${pointName} (${x},${y},${z})`,
        },
      });
      hideModal();
      setIsFormValidated(false);
    } else {
      e.stopPropagation();
    }

    setIsFormValidated(true);
  };

  return (
    <Modal
      show={!isHidden}
      onHide={() => {
        hideModal();
        setIsFormValidated(false);
      }}
    >
      <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Create directory</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Label className="me-0 pe-0" sm={2} column>
              name
            </Form.Label>
            <Col className="ms-0 ps-0" sm={10}>
              <Form.Control
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
                type="text"
                required
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Btn variant="outline-success" type="submit">
            Create
          </Btn>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default SavePointModal;
