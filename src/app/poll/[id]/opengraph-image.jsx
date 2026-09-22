import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { getPollForPreview } from "@/lib/poll-metadata";

export const alt = "Community poll on What Do You Think?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  const poll = await getPollForPreview(id);
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/NotoSansBengali-Regular.ttf")),
    readFile(join(process.cwd(), "assets/NotoSansBengali-Bold.ttf")),
  ]);

  const question = poll?.question || "What do you think?";
  const previewQuestion = question.length > 105 ? `${question.slice(0, 102)}…` : question;
  const options = poll?.options?.slice(0, 3) || [];

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 56, background: "#F7FBF9", color: "#162F26", fontFamily: "Noto Bengali" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 14, background: "#1B4332", color: "white" }}>?</div>
          What Do You Think?
        </div>
        <div style={{ display: "flex", padding: "11px 20px", borderRadius: 99, background: "#E3F0E9", color: "#1B4332", fontSize: 22, fontWeight: 700 }}>
          {poll?.category || "Community poll"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: 22 }}>
        <div style={{ display: "flex", fontSize: previewQuestion.length > 80 ? 38 : previewQuestion.length > 60 ? 44 : 52, fontWeight: 700, lineHeight: 1.28, marginBottom: 28, overflow: "hidden", maxHeight: 190 }}>
          {previewQuestion}
        </div>
        {options.map((option, index) => (
          <div key={option.id || index} style={{ display: "flex", alignItems: "center", marginBottom: 10, padding: "12px 18px", minHeight: 57, border: "1px solid #C8DCD1", borderRadius: 15, background: "#FFFFFF", fontSize: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 29, height: 29, marginRight: 17, border: "2px solid #87AA98", borderRadius: 99 }} />
            {option.label.length > 50 ? `${option.label.slice(0, 47)}…` : option.label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 22, borderTop: "2px solid #DCE9E1", fontSize: 23 }}>
        <span style={{ color: "#5B7366" }}>{poll ? `${poll.totalVotes.toLocaleString("en-BD")} votes` : "Your voice matters"}</span>
        <span style={{ fontWeight: 700, color: "#1B4332" }}>Open poll to vote →</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Noto Bengali", data: regular, style: "normal", weight: 400 },
        { name: "Noto Bengali", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
