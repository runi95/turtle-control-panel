"use client";

import { useQuery } from "@tanstack/react-query";
import { Atlas } from "../../server/loadAssets";

export type Atlases = Record<string, Atlas>;

export const useAtlases = () => {
  return useQuery<Atlases>({
    queryKey: ["atlases"],
    queryFn: () => fetch("/api/assets/atlases").then((res) => res.json()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};
