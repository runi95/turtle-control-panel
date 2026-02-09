import { NextRequest } from "next/server";
import { getTurtle } from "../../../../../../server/db";
import { getOnlineTurtleById } from "../../../../../../server/entities/turtle";

type Params = {
  id: string;
  turtleId: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  const { id, turtleId } = await context.params;
  const turtle = getOnlineTurtleById(Number(id), Number(turtleId));
  if (turtle !== undefined) {
    const {
      name,
      fuelLevel,
      fuelLimit,
      selectedSlot,
      inventory,
      stepsSinceLastRefuel,
      state,
      location,
      direction,
      peripherals,
      home,
      error,
    } = turtle;
    Response.json({
      id: turtleId,
      serverId: id,
      name,
      isOnline: true,
      fuelLevel,
      fuelLimit,
      selectedSlot,
      inventory,
      stepsSinceLastRefuel,
      state: state?.data ?? null,
      location,
      direction,
      peripherals,
      home,
      error,
    });
    return;
  }

  const dbTurtle = getTurtle(Number(id), Number(turtleId));
  if (dbTurtle === null) {
    return new Response("Not Found", { status: 404 });
  }

  const {
    name,
    fuelLevel,
    fuelLimit,
    selectedSlot,
    inventory,
    stepsSinceLastRefuel,
    state,
    location,
    direction,
    home,
  } = dbTurtle;
  return Response.json({
    id: turtleId,
    serverId: id,
    name,
    isOnline: false,
    fuelLevel,
    fuelLimit,
    selectedSlot,
    inventory,
    stepsSinceLastRefuel,
    state,
    location,
    direction,
    peripherals: null,
    home,
    error: null,
  });
}
