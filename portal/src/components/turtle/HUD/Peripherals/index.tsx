import styled from 'styled-components';
import {Peripheral, Turtle} from '../../../../api/UseTurtle';
import GeoScanner from './GeoScanner';
import WirelessModem from './WirelessModem';
import {Accordion} from 'react-bootstrap';
import './Peripherals.css';
import ExternalInventory from './ExternalInventory';
import {useWebSocket} from '../../../../api/UseWebSocket';
import CraftingTable from './CraftingTable';

interface Props {
    turtle: Turtle;
}

function Peripherals(props: Props) {
    const {turtle} = props;
    const {action} = useWebSocket();

    const renderPeripheral = (side: string, peripheral: Peripheral, i: number) => {
        const {types, data} = peripheral;
        const {isModem, isWirelessModem, isGeoScanner, isExternalInventory, isCraftingTable} = types.reduce(
            (acc, curr) => {
                switch (curr) {
                    case 'modem':
                        acc.isModem = true;
                        if ((data as {isWireless: boolean} | undefined)?.isWireless) {
                            acc.isWirelessModem = true;
                        }
                        break;
                    case 'geoScanner':
                        acc.isGeoScanner = true;
                        break;
                    case 'inventory':
                        acc.isExternalInventory = true;
                        break;
                    case 'workbench':
                        acc.isCraftingTable = true;
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
            }
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
                <Accordion.Item data-bs-theme='light' key={i} eventKey={`${i}`}>
                    <Accordion.Header>External Inventory</Accordion.Header>
                    <Accordion.Body>
                        <ExternalInventory side={side} peripheral={peripheral} action={action} />
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
                        renderPeripheral(side, peripheral, i)
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
