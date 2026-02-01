"use client";

import { Peripheral } from "../../../../../../hooks/useTurtle";
import { Action } from "../../../../../../types/action";
import InventoryPeripheral, {
  InventoryPeripheralContent,
} from "./inventoryPeripheral";

export interface Props {
  action: Action;
  side: string;
  peripheral: Peripheral;
}

function ExternalInventory(props: Props) {
  const { action, side, peripheral } = props;
  const { data } = peripheral;

  if (data == null) return null;

  const { size, content } = data as {
    size: number;
    content: InventoryPeripheralContent;
  };
  return (
    <InventoryPeripheral
      side={side}
      size={size ?? null}
      content={content ?? null}
      connected={false}
      action={action}
    />
  );
}

export default ExternalInventory;
