import { ImageResponse } from "next/og";
import { getSiteLogoDataUrl } from "@/lib/site-icon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: requestedSize } = await params;
  const size = Number(requestedSize);
  if (size !== 192 && size !== 512) {
    return new Response("Not found", { status: 404 });
  }

  const logo = await getSiteLogoDataUrl();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#173f3a",
        borderRadius: size * 0.1875,
        overflow: "hidden",
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ color: "#f4c95d", fontSize: size * 0.37, fontWeight: 700 }}>
          ف
        </div>
      )}
    </div>,
    { width: size, height: size },
  );
}