"use client";

import { useQuery } from "@tanstack/react-query";
import { Blockstate } from "../../server/loadAssets";

export type Blockstates = Record<string, Blockstate>;

export const useBlockstates = () => {
  return useQuery<Blockstates>({
    queryKey: ["blockstates"],
    queryFn: () => fetch("/api/assets/blockstates").then((res) => res.json()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};
