"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageData } from "canvas";

export type Textures = Record<string, ImageData>;

export const useTextures = () => {
  return useQuery<Textures>({
    queryKey: ["textures"],
    queryFn: () => fetch("/api/assets/textures").then((res) => res.json()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};
