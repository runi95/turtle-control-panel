"use client";

import { Nav, Navbar } from "react-bootstrap";
import {
  ConnectionStatus,
  useWebSocketConnectionStatus,
} from "../contexts/webSocketContext";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";

export type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const router = useRouter();
  const connectionStatus = useWebSocketConnectionStatus();

  return (
    <div>
      <Navbar style={{ backgroundColor: "#27293d" }} variant="dark">
        <Navbar.Brand
          className="mr-auto"
          style={{ cursor: "pointer" }}
          onClick={() => router.push("/dashboard")}
        >
          <img
            alt="Logo"
            src="/logo.svg"
            width="32"
            height="32"
            className="d-inline-block align-top"
          />{" "}
          Dashboard
        </Navbar.Brand>
        {connectionStatus !== ConnectionStatus.CONNECTED && (
          <Nav>
            <img
              className="blinking"
              alt="No signal"
              src="/nosignal.svg"
              width="32"
              height="32"
            />
          </Nav>
        )}
      </Navbar>
      {children}
    </div>
  );
}
