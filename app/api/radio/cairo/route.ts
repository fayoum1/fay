export const runtime = "nodejs";

export async function GET() {
  const upstream = await fetch("http://live.mp3quran.net:9842/", { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Radio stream unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
    },
  });
}
