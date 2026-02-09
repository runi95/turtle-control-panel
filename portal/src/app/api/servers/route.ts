import { getDashboard } from "../../../server/db";
import { getOnlineTurtles } from "../../../server/entities/turtle";

export async function GET() {
  return Response.json({
    dashboard: getDashboard(),
    onlineStatuses: getOnlineTurtles().map((turtle) => ({
      serverId: turtle.serverId,
      id: turtle.id,
      isOnline: turtle.isOnline,
    })),
  });
}
