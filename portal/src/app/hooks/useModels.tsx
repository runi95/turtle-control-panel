"use client";

import { useQuery } from "@tanstack/react-query";
import { Model } from "../../loadAssets";

export type Models = Record<string, Model>;

export const useModels = () => {
  return useQuery<Models>({
    queryKey: ["models"],
    queryFn: () => fetch("/api/assets/models").then((res) => res.json()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};
