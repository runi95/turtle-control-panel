"use client";

import styled from "styled-components";
import { Button } from "react-bootstrap";
import { Turtle } from "../../../../../../hooks/useTurtle";
import { Action } from "../../../../../../types/action";

export interface Props {
  turtle: Turtle;
  action: Action;
}

function WirelessModem(props: Props) {
  const { turtle, action } = props;

  // Weird hack to fix issues with @react-three/drei
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Btn: any = Button;

  const { serverId, id } = turtle;
  return (
    <PeripheralContainer>
      <Btn
        onClick={() =>
          action({ type: "ACTION", action: "locate", data: { serverId, id } })
        }
        variant={"outline-info"}
        size="sm"
        disabled={!turtle.isOnline}
      >
        Locate
      </Btn>
    </PeripheralContainer>
  );
}

const PeripheralContainer = styled.div`
  display: flex;
  gap: 5px;
`;

export default WirelessModem;
