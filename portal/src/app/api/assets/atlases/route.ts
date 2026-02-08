import { promises as fs } from "fs";

export async function GET() {
  return Response.json(
    JSON.parse(await fs.readFile("assets/atlases.json", "utf-8")),
  );
}
