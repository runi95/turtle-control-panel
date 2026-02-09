import { NextRequest } from "next/server";
import { getChunk } from "../../../../../server/db";

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const x = searchParams.get("x");
  const z = searchParams.get("z");

  return Response.json(getChunk(Number(id), Number(x), Number(z)));
}
