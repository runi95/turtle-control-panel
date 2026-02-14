"use client";

import { useQueries } from "@tanstack/react-query";
import { ImageData } from "canvas";

export type MultipleTexturesResult = {
  isSuccess: boolean;
  isLoading: boolean;
  smallTextures: Map<string, ImageData>;
  mediumTextures: Map<string, ImageData>;
  largeTextures: Map<string, ImageData>;
};

export const useMultipleTextures = (uniqueTextures: string[]) =>
  useQueries({
    queries: [...uniqueTextures].map((textureName) => ({
      queryKey: ["textures", textureName],
      queryFn: () =>
        fetch(`/api/assets/textures/${textureName}`)
          .then((res) => res.json() as Promise<ImageData>)
          .then((texture) => ({
            name: textureName,
            texture,
          })),
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    })),
    combine: (results) =>
      results.reduce<MultipleTexturesResult>(
        (acc, curr) => {
          if (curr.isLoading) {
            acc.isLoading = true;
            return acc;
          }
          if (!curr.isSuccess) return acc;

          const { data } = curr;
          if (data == null) return acc;

          const { texture } = data;
          const { width, height } = texture;
          if (width === 16 && height === 16) {
            acc.smallTextures.set(data.name, texture);
          } else if (width === 32 && height === 32) {
            acc.mediumTextures.set(data.name, texture);
          } else if (width === 64 && height === 64) {
            acc.largeTextures.set(data.name, texture);
          } else {
            return acc;
          }

          acc.isSuccess = true;
          return acc;
        },
        {
          isSuccess: false,
          isLoading: false,
          smallTextures: new Map<string, ImageData>(),
          mediumTextures: new Map<string, ImageData>(),
          largeTextures: new Map<string, ImageData>(),
        },
      ),
  });
