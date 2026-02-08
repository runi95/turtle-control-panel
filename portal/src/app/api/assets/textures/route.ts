import { promises as fs } from "fs";
import { Textures } from "../../../hooks/useTextures";
import unknown from "./unknown";

export async function GET() {
  const textures = JSON.parse(
    await fs.readFile("assets/textures.json", "utf-8"),
  ) as Textures;
  textures["unknown"] = {
    width: 16,
    height: 16,
    data: unknown,
  };

  return Response.json(textures);
}
