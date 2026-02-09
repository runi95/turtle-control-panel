import { NextRequest } from "next/server";
import { getTurtlesByServerId } from "../../../../../server/db";
import { getOnlineTurtleById } from "../../../../../server/entities/turtle";

type Params = {
  id: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id } = await context.params;
  const turtles = getTurtlesByServerId(Number(id));

  return Response.json(
    turtles.map((turtle) => ({
      ...turtle,
      isOnline: getOnlineTurtleById(Number(id), turtle.id) == null,
    })),
  );
}
