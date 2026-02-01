"use client";

import "./page.css";
import { useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import { useServers } from "../hooks/useServers";
import Editor from "./editor";
import Server from "./server";

export default function Dashboard() {
  const [isInEditMode, setEditModeEnabled] = useState(false);
  const { data: servers } = useServers();

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  if (servers == null) return null;

  return isInEditMode ? (
    <Editor servers={servers} closeEditMode={() => setEditModeEnabled(false)} />
  ) : (
    <Container fluid>
      {Object.values(servers).map((server) => (
        <Row key={server.id} className="mt-3">
          <Col>
            <Server server={server} />
          </Col>
        </Row>
      ))}
      <Row>
        <Col>
          <Btn
            variant="link"
            size="sm"
            onClick={() => setEditModeEnabled(true)}
          >
            Update server names
          </Btn>
        </Col>
      </Row>
    </Container>
  );
}
