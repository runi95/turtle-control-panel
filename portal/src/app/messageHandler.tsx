"use client";

import { ReactNode, useEffect } from "react";
import { Block } from "./types/block";
import { Blocks } from "./types/blocks";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./contexts/webSocketContext";
import { Location } from "./types/location";
import { Turtle as APITurtle } from "./hooks/useTurtle";

export type Props = {
  children: ReactNode;
};

export default function MessageHandler({ children }: Props) {
  const { socket } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (socket == null) return;

    function onMessage(msg: string) {
      const obj = JSON.parse(msg);

      switch (obj.type) {
        case "TUPDATE":
          queryClient.setQueryData(
            [
              "turtles",
              obj.message.serverId.toString(),
              obj.message.id.toString(),
            ],
            (oldData: APITurtle) => ({
              ...oldData,
              ...obj.message.data,
            }),
          );
          queryClient.setQueryData(
            ["turtles", obj.message.serverId.toString()],
            (oldData: APITurtle[]) =>
              oldData?.reduce((acc, curr) => {
                if (curr.id === obj.message.id) {
                  acc.push({
                    ...curr,
                    ...obj.message.data,
                  });
                } else {
                  acc.push({
                    ...curr,
                  });
                }

                return acc;
              }, [] as APITurtle[]),
          );
          break;
        case "WUPDATE":
          // TODO: Support quick rerender instead of full rerender on each update
          queryClient.setQueriesData(
            {
              queryKey: ["blocks", obj.message.serverId.toString()],
            },
            (oldData: Blocks | undefined) => {
              const newData = { ...oldData };

              (obj.message.deletedBlocks as Location[])?.forEach(
                ({ x, y, z }: Location) => delete newData[`${x},${y},${z}`],
              );

              (obj.message.blocks as Block[])?.forEach(
                (block) =>
                  (newData[`${block.x},${block.y},${block.z}`] = block),
              );

              return newData;
            },
          );
      }
    }

    socket.on("message", onMessage);

    return () => {
      socket.off("message", onMessage);
    };
  }, [socket]);

  return children;
}
