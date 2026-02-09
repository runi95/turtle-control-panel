import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");
  if (url == null) {
    throw new Error(`Missing 'url' query parameter`);
  }

  const parsed = new URL(url);
  if (
    parsed.hostname !== "www.grabcraft.com" &&
    parsed.hostname !== "grabcraft.com"
  ) {
    throw new Error(`Invalid hostname for 'url' parameter`);
  }

  const grabcraftResponse = await fetch(parsed);
  if (!grabcraftResponse.ok) {
    return new Response("Failed to fetch grabcraft URL", {
      status: grabcraftResponse.status,
    });
  }

  const text = await grabcraftResponse.text();

  const contentType =
    grabcraftResponse.headers.get("content-type") ??
    "text/plain; charset=utf-8";

  return new Response(text, {
    status: 200,
    headers: { "content-type": contentType },
  });
}
