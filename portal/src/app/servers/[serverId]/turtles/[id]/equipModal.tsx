"use client";

import { Modal, Row, Button } from "react-bootstrap";

type Props = {
  isVisible: boolean;
  hideModal: () => void;
  handleEquip: (side: "left" | "right") => void;
};

function EquipModal({ isVisible, hideModal, handleEquip }: Props) {
  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  return (
    <Modal show={isVisible} onHide={() => hideModal()}>
      <Modal.Header closeButton>
        <Modal.Title>Equip</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-3">
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Btn variant="outline-info" onClick={() => handleEquip("left")}>
              Left side
            </Btn>
            <Btn variant="outline-info" onClick={() => handleEquip("right")}>
              Right side
            </Btn>
          </div>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default EquipModal;
