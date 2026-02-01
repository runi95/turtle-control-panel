"use client";

import "./peripherals.css";
import styled from "styled-components";
import { Peripheral, Turtle } from "../../../../../../hooks/useTurtle";
import GeoScanner from "./geoScanner";
import WirelessModem from "./wirelessModem";
import { Accordion } from "react-bootstrap";
import ExternalInventory from "./externalInventory";
import CraftingTable from "./craftingTable";
import TurtlePeripheral from "./turtlePeripheral";
import Drive from "./drive";
import UniversalScanner from "./universalScanner";
import BlockScanner from "./blockScanner";
import UltimateSensor from "./ultimateSensor";
import Chatter from "./chatter";
import EndAutomataCore from "./endAutomataCore";
import { useWebSocket } from "../../../../../../contexts/webSocketContext";

interface Props {
  turtle: Turtle;
}

function Peripherals(props: Props) {
  const { turtle } = props;
  const { action } = useWebSocket();

  const renderPeripheral = (
    side: string,
    peripheral: Peripheral,
    i: number,
  ) => {
    const { types, data } = peripheral;
    const {
      isModem,
      isWirelessModem,
      isGeoScanner,
      isExternalInventory,
      isCraftingTable,
      isTurtle,
      isDrive,
      isUniversalScanner,
      isUltimateSensor,
      isBlockScanner,
      isChatter,
      isEndAutomata,
    } = types.reduce(
      (acc, curr) => {
        switch (curr) {
          case "modem":
            acc.isModem = true;
            if ((data as { isWireless: boolean } | undefined)?.isWireless) {
              acc.isWirelessModem = true;
            }
            break;
          case "geoScanner":
            acc.isGeoScanner = true;
            break;
          case "universal_scanner":
            acc.isUniversalScanner = true;
            break;
          case "ultimate_sensor":
            acc.isUltimateSensor = true;
            break;
          case "plethora:scanner":
            acc.isBlockScanner = true;
            break;
          case "inventory":
            acc.isExternalInventory = true;
            break;
          case "workbench":
            acc.isCraftingTable = true;
            break;
          case "turtle":
            acc.isTurtle = true;
            break;
          case "drive":
            acc.isDrive = true;
            break;
          case "chatter":
            acc.isChatter = true;
            break;
          case "endAutomata":
            acc.isEndAutomata = true;
            break;
        }

        return acc;
      },
      {
        isModem: false,
        isWirelessModem: false,
        isGeoScanner: false,
        isExternalInventory: false,
        isCraftingTable: false,
        isTurtle: false,
        isDrive: false,
        isUniversalScanner: false,
        isUltimateSensor: false,
        isBlockScanner: false,
        isChatter: false,
        isEndAutomata: false,
      },
    );

    if (isModem) {
      if (isWirelessModem) {
        return (
          <Accordion.Item key={i} eventKey={`${i}`}>
            <Accordion.Header>Wireless Modem</Accordion.Header>
            <Accordion.Body>
              <WirelessModem action={action} turtle={turtle} />
            </Accordion.Body>
          </Accordion.Item>
        );
      }

      return null;
    }

    if (isGeoScanner) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Geo Scanner</Accordion.Header>
          <Accordion.Body>
            <GeoScanner action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isUniversalScanner) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Universal Scanner</Accordion.Header>
          <Accordion.Body>
            <UniversalScanner action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isUltimateSensor) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Ultimate Sensor</Accordion.Header>
          <Accordion.Body>
            <UltimateSensor action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isBlockScanner) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Block Scanner</Accordion.Header>
          <Accordion.Body>
            <BlockScanner action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isCraftingTable) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Crafting Table</Accordion.Header>
          <Accordion.Body>
            <CraftingTable action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isExternalInventory) {
      return (
        <Accordion.Item data-bs-theme="light" key={i} eventKey={`${i}`}>
          <Accordion.Header>External Inventory</Accordion.Header>
          <Accordion.Body>
            <ExternalInventory
              side={side}
              peripheral={peripheral}
              action={action}
            />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isTurtle) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Turtle</Accordion.Header>
          <Accordion.Body>
            <TurtlePeripheral side={side} action={action} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isDrive) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Drive</Accordion.Header>
          <Accordion.Body>
            <Drive action={action} peripheral={peripheral} turtle={turtle} />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isChatter) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>Chatter</Accordion.Header>
          <Accordion.Body>
            <Chatter
              action={action}
              side={side}
              peripheral={peripheral}
              turtle={turtle}
            />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    if (isEndAutomata) {
      return (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>End automata core</Accordion.Header>
          <Accordion.Body>
            <EndAutomataCore
              action={action}
              side={side}
              peripheral={peripheral}
              turtle={turtle}
            />
          </Accordion.Body>
        </Accordion.Item>
      );
    }

    return null;
  };

  return (
    <Wrapper>
      {turtle.peripherals != null ? (
        <Accordion>
          {Object.entries(turtle.peripherals).map(([side, peripheral], i) =>
            renderPeripheral(side, peripheral, i),
          )}
        </Accordion>
      ) : null}
    </Wrapper>
  );
}

export default Peripherals;

const Wrapper = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
