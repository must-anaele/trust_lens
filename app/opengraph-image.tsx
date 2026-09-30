import { ImageResponse } from "next/og";

export const alt = "TRUST Lens — evidence-based blockchain trust analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px 88px",
          color: "#f4f8ff",
          background: "linear-gradient(135deg, #07121d 0%, #102638 58%, #0a2930 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 44 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #4f8cff, #26d3a6)", color: "#07121d", fontSize: 30, fontWeight: 700 }}>T</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>TRUST LENS</div>
        </div>
        <div style={{ maxWidth: 900, fontSize: 66, lineHeight: 1.12, fontWeight: 700, letterSpacing: -2 }}>
          Evidence-based blockchain trust analysis
        </div>
        <div style={{ display: "flex", marginTop: 34, color: "#b5c7d8", fontSize: 25 }}>
          Review contract capabilities and wallet approvals
        </div>
        <div style={{ display: "flex", position: "absolute", right: 88, bottom: 56, color: "#26d3a6", fontSize: 20, letterSpacing: 2 }}>
          TRUST-LENS-OMEGA.VERCEL.APP
        </div>
      </div>
    ),
    { ...size },
  );
}
