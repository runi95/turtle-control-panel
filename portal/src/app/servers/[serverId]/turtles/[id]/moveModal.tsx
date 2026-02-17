"use client";

import "./buildModal.css";
import { ChangeEvent, useState } from "react";
import { Modal, Form, Button, Row, Col } from "react-bootstrap";

type Props = {
  hideModal: () => void;
  onSubmit: (x: number, y: number, z: number) => void;
};

function MoveModal({ hideModal, onSubmit }: Props) {
  const [isFormValidated, setIsFormValidated] = useState(false);
  const [x, setX] = useState<number | undefined>(undefined);
  const [y, setY] = useState<number | undefined>(undefined);
  const [z, setZ] = useState<number | undefined>(undefined);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (form.checkValidity() === true && x != null && y != null && z != null) {
      onSubmit(x, y, z);
      hideModal();
    } else {
      e.stopPropagation();
    }

    setIsFormValidated(true);
  };

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  return (
    <Modal show={true} onHide={() => hideModal()}>
      <Form noValidate validated={isFormValidated} onSubmit={handleFormSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Move to coordinates</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col sm={4}>
              <Form.Group>
                <Form.Control
                  value={x ?? ""}
                  type="number"
                  placeholder="x"
                  required
                  step={1}
                  onChange={(e: ChangeEvent<HTMLInputElement, Element>) =>
                    setX(
                      Number.isNaN(e.target.valueAsNumber)
                        ? undefined
                        : e.currentTarget.valueAsNumber,
                    )
                  }
                />
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group>
                <Form.Control
                  value={y ?? ""}
                  type="number"
                  placeholder="y"
                  required
                  step={1}
                  onChange={(e: ChangeEvent<HTMLInputElement, Element>) =>
                    setY(
                      Number.isNaN(e.target.valueAsNumber)
                        ? undefined
                        : e.currentTarget.valueAsNumber,
                    )
                  }
                />
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group>
                <Form.Control
                  value={z ?? ""}
                  type="number"
                  placeholder="z"
                  required
                  step={1}
                  onChange={(e: ChangeEvent<HTMLInputElement, Element>) =>
                    setZ(
                      Number.isNaN(e.target.valueAsNumber)
                        ? undefined
                        : e.currentTarget.valueAsNumber,
                    )
                  }
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Btn variant="outline-success" type="submit">
            Move
          </Btn>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default MoveModal;
