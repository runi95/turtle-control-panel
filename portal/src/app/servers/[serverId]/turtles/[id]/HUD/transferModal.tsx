"use client";

import { Modal, Form, Row, Col, Button } from "react-bootstrap";
import { useState } from "react";

type ItemTransfer = {
  itemName: string;
  maxAmount: number;
};

type Props = {
  itemTransfer: ItemTransfer | null;
  isFormValidated: boolean;
  hideModal: () => void;
  handleFormSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    amount: number,
  ) => void;
};

function TransferModal({
  itemTransfer,
  isFormValidated,
  hideModal,
  handleFormSubmit,
}: Props) {
  const [amount, setAmount] = useState(0);

  if (itemTransfer == null) return null;

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  return (
    <Modal show={true} onHide={() => hideModal()}>
      <Form
        noValidate
        validated={isFormValidated}
        onSubmit={(e) => {
          handleFormSubmit(e, amount);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Transferring {itemTransfer.itemName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Label className="me-0 pe-0" sm={2} column>
              Amount
            </Form.Label>
            <Col className="ms-0 ps-0" sm={10}>
              <Form.Control
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                type="number"
                min={0}
                max={itemTransfer.maxAmount}
                required
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Btn variant="outline-success" type="submit">
            Transfer
          </Btn>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default TransferModal;
