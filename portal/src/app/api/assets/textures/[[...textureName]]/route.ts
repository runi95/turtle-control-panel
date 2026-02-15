import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { Textures } from "../../../../hooks/useTextures";
import unknown from "./unknown";

const pathSubstrLength = "/api/assets/textures/".length;

let cachedTextures: Textures | null = null;

const readTextureCache = async () => {
  if (cachedTextures != null) return cachedTextures;

  const textures = await fs
    .readFile("assets/textures.json", "utf-8")
    .then((textures) => JSON.parse(textures) as Textures);
  cachedTextures = textures;

  return textures;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const textureName = url.pathname.substring(pathSubstrLength);

  if (textureName === "unknown") {
    return Response.json({
      width: 16,
      height: 16,
      data: unknown,
    });
  }

  const textures = await readTextureCache();
  const texture = textures[textureName];
  if (texture == null) {
    return new Response("Not Found", {
      status: 404,
    });
  }

  return Response.json(texture);
}
