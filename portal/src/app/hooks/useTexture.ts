"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageData } from "canvas";

export const useTexture = (textureName: string) => {
  return useQuery<ImageData>({
    queryKey: ["textures", textureName],
    queryFn: () =>
      fetch(`/api/assets/textures/${textureName}`).then((res) => res.json()),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
};
