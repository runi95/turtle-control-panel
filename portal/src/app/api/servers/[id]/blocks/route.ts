import { NextRequest } from "next/server";
import { getBlocks, getBlocksSimple } from "../../../../../server/db";

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const fromX = searchParams.get("fromX");
  const toX = searchParams.get("toX");
  const fromY = searchParams.get("fromY");
  const toY = searchParams.get("toY");
  const fromZ = searchParams.get("fromZ");
  const toZ = searchParams.get("toZ");
  const name = searchParams.get("name");
  const simple = searchParams.get("simple");

  return Response.json(
    (simple != null ? getBlocksSimple : getBlocks)(Number(id), {
      fromX: Number(fromX),
      toX: Number(toX),
      fromY: Number(fromY),
      toY: Number(toY),
      fromZ: Number(fromZ),
      toZ: Number(toZ),
      name: name ?? undefined,
    }),
  );
}
