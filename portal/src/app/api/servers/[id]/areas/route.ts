import { NextRequest } from "next/server";
import { getAreas } from "../../../../../server/db";

type Params = {
  id: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;

  return Response.json(getAreas(Number(id)));
}
