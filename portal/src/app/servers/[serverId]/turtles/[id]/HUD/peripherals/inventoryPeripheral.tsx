"use client";

import styled from "styled-components";
import Item from "../item";
import { ItemDetail, useTurtle } from "../../../../../../hooks/useTurtle";
import TransferModal from "../transferModal";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Action } from "../../../../../../types/action";

type ItemTransfer = {
  fromSide: string;
  fromSlot: number;
  toSlot: number;
  itemName: string;
  maxAmount: number;
  isFormValidated: boolean;
};

export interface InventoryPeripheralContent {
  [key: number]: ItemDetail | null;
}

export interface InventoryPeripheralProps {
  side: string;
  size: number | null;
  content: InventoryPeripheralContent | null;
  connected: boolean;
  action: Action;
}

function InventoryPeripheral(props: InventoryPeripheralProps) {
  const { side, action, size, content } = props;
  const { serverId, id } = useParams<{ serverId: string; id: string }>();
  const { data: turtle } = useTurtle(serverId, id);
  const [itemTransfer, setItemTransfer] = useState<ItemTransfer | null>(null!);

  const transfer = (
    fromSide: string,
    fromSlot: number,
    toSlot: number,
    count?: number,
  ) => {
    props.action({
      type: "ACTION",
      action: "inventory-push-items",
      data: {
        serverId,
        id,
        fromSide,
        toSide: side,
        fromSlot,
        toSlot,
        count,
      },
    });
  };

  const renderTiles = (
    size: number | null,
    content: InventoryPeripheralContent | null,
  ) => {
    if (size === null) return null;

    const tiles = [];
    for (let i = 0; i < size; i++) {
      const itemDetail = content === null ? null : content[i];
      const isEmpty = itemDetail == null;
      tiles.push(
        <Item
          key={i}
          displayName={
            isEmpty ? "Empty" : (itemDetail.displayName ?? itemDetail.name)
          }
          isSelected={false}
          index={i + 1}
          side={side}
          item={
            isEmpty ? null : { name: itemDetail.name, count: itemDetail.count }
          }
          onDrop={(
            shiftKey: boolean,
            fromSide: string,
            fromSlot: number,
            toSlot: number,
            item?: {
              name: string;
              amount: number;
            },
          ) => {
            if (item == null) return;
            if (shiftKey && item.amount > 1) {
              setItemTransfer({
                fromSide,
                fromSlot,
                toSlot,
                itemName: item.name,
                maxAmount: item.amount,
                isFormValidated: false,
              });
            } else {
              transfer(fromSide, fromSlot, toSlot);
            }
          }}
          onClick={undefined}
        />,
      );
    }

    return tiles;
  };

  if (turtle === undefined) return null;

  return (
    <>
      <TransferModal
        itemTransfer={itemTransfer}
        hideModal={() => setItemTransfer(null)}
        isFormValidated={itemTransfer?.isFormValidated ?? false}
        handleFormSubmit={(
          e: React.FormEvent<HTMLFormElement>,
          amount: number,
        ) => {
          e.preventDefault();
          if (itemTransfer == null) return;

          const form = e.currentTarget;
          if (form.checkValidity() === true) {
            if (amount > 0) {
              transfer(
                itemTransfer.fromSide,
                itemTransfer.fromSlot,
                itemTransfer.toSlot,
                amount,
              );
            }

            setItemTransfer(null);
          } else {
            setItemTransfer({
              ...itemTransfer,
              isFormValidated: true,
            });
            e.stopPropagation();
          }
        }}
      />
      <div className="inventory-container">
        <InventoryGrid>
          <div
            className="text-muted"
            style={{
              gridColumn: "1/-1",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <button
              className="text-muted inventory-button"
              onClick={() =>
                action({
                  type: "ACTION",
                  action: "connect-to-inventory",
                  data: { serverId, id: turtle.id, side },
                })
              }
              disabled={
                !turtle.isOnline || !turtle.location || !turtle.direction
              }
            >
              <b>Refresh</b>
            </button>
            <button
              className="text-muted inventory-button"
              onClick={() =>
                action({
                  type: "ACTION",
                  action: "sort-inventory",
                  data: { serverId, id: turtle.id, side },
                })
              }
              disabled={
                !turtle.isOnline || !turtle.location || !turtle.direction
              }
            >
              <b>Sort</b>
            </button>
            <div style={{ fontWeight: "bold", marginLeft: "auto" }}>
              (<span className="text-primary">{side}</span>)
            </div>
          </div>
          {renderTiles(size, content)}
        </InventoryGrid>
      </div>
    </>
  );
}

const InventoryGrid = styled.div`
  display: inline-grid;
  grid-template-columns: auto auto auto auto auto auto auto auto auto;
  grid-gap: 6px;
`;

export default InventoryPeripheral;
