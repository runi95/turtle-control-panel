"use client";

import { ImageData } from "canvas";
import { useEffect, useState } from "react";

export type MultipleTexturesResult = {
  smallTextures: Map<string, ImageData>;
  mediumTextures: Map<string, ImageData>;
  largeTextures: Map<string, ImageData>;
};

const cache = new Map<string, ImageData>();

export const useMultipleTextures = (uniqueTextures: string[]) => {
  const [textures, setTextures] = useState<MultipleTexturesResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const loadTextures = async () => {
      try {
        const results = await Promise.all(
          uniqueTextures.map(async (name) => {
            const cachedTexture = cache.get(name);
            if (cachedTexture != null) {
              return {
                name,
                texture: cachedTexture,
              };
            }

            const res = await fetch(`/api/assets/textures/${name}`, {
              signal: controller.signal,
            });

            if (!res.ok) throw new Error(`Failed to fetch texture ${name}`);

            const texture = (await res.json()) as ImageData;
            cache.set(name, texture);
            return { name, texture };
          }),
        );

        if (cancelled) return;

        const smallTextures = new Map<string, ImageData>();
        const mediumTextures = new Map<string, ImageData>();
        const largeTextures = new Map<string, ImageData>();
        for (const { name, texture } of results) {
          const { width, height } = texture;
          if (width === 16 && height === 16) {
            smallTextures.set(name, texture);
          } else if (width === 32 && height === 32) {
            mediumTextures.set(name, texture);
          } else if (width === 64 && height === 64) {
            largeTextures.set(name, texture);
          }
        }

        setTextures({
          smallTextures,
          mediumTextures,
          largeTextures,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
      }
    };

    loadTextures();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [uniqueTextures]);

  return textures;
};
