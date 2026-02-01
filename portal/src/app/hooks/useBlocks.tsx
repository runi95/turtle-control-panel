"use client";

import { useQuery } from "@tanstack/react-query";
import { HTTP_SERVER_URL } from "../env";
import { Blocks } from "../types/blocks";
import { Block } from "../types/block";

export type QueryParams = {
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  fromZ: number;
  toZ: number;
  simple?: boolean;
};

export const useBlocks = (
  serverId: string,
  query: QueryParams,
  isEnabled: boolean,
) => {
  return useQuery<Blocks>({
    queryKey: ["blocks", serverId, { query }],
    queryFn: () =>
      fetch(
        `${HTTP_SERVER_URL}/servers/${serverId}/blocks?fromX=${query.fromX}&toX=${query.toX}&fromY=${query.fromY}&toY=${query.toY}&fromZ=${query.fromZ}&toZ=${query.toZ}${query.simple ? "&simple" : ""}`,
      )
        .then((res) => res.json())
        .then((data: Block[]) =>
          data.reduce(
            (acc, curr) => ((acc[`${curr.x},${curr.y},${curr.z}`] = curr), acc),
            {} as { [key: string]: Block },
          ),
        ),
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
