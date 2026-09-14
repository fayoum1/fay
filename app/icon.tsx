import { ImageResponse } from "next/og";
import { getSiteLogoDataUrl } from "@/lib/site-icon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await getSiteLogoDataUrl();
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#173f3a", borderRadius: 96 }}>
      {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 96 }} /> : <div style={{ color: "#f4c95d", fontSize: 190, fontWeight: 700 }}>ف</div>}
    </div>,
    { ...size },
  );
}
