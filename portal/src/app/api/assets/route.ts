import { promises as fs } from "fs";

export async function GET() {
  return Response.json({
    atlases: JSON.parse(await fs.readFile("assets/atlases.json", "utf-8")),
    blockstates: JSON.parse(
      await fs.readFile("assets/blockstates.json", "utf-8"),
    ),
    models: JSON.parse(await fs.readFile("assets/models.json", "utf-8")),
    textures: JSON.parse(await fs.readFile("assets/textures.json", "utf-8")),
  });
}
