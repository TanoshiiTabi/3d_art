"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Uploader from "@/components/Uploader";
import SceneErrorBoundary from "@/components/SceneErrorBoundary";

const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#6d28d9", fontSize: 13, letterSpacing: "0.05em" }}>Loading WebGL…</span>
    </div>
  ),
});

export default function Home() {
  const [imageCanvas, setImageCanvas] = useState<HTMLCanvasElement | null>(null);

  const handleImageReady = useCallback((canvas: HTMLCanvasElement) => {
    setImageCanvas(canvas);
  }, []);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#0a0a0f", color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Left panel ── */}
      <div style={{
        width: 340, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(10,10,20,0.95)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 style={{
            margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #a78bfa, #f0abfc, #67e8f9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            3D Fragment FX
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
            Upload · 3D shard assembly · Export code
          </p>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Upload section */}
          <SectionLabel>Image</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            <Uploader onImageReady={handleImageReady} />
          </div>

          {/* Tech chips */}
          <SectionLabel>Tech Stack</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
            {["React Three Fiber", "GSAP", "instancedMesh", "Custom Shader"].map((t) => (
              <span key={t} style={{
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(109,40,217,0.12)", border: "1px solid rgba(109,40,217,0.25)",
                color: "#c4b5fd", fontSize: 11,
              }}>{t}</span>
            ))}
          </div>

          {/* Instructions */}
          <SectionLabel>How it works</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["01", "Upload any photo"],
              ["02", "Watch 64 shards fly in from depth and lock together"],
              ["03", "Use the controls to replay the animation"],
            ].map(([n, t]) => (
              <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.35)",
                  color: "#a78bfa", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{n}</span>
                <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#334155" }}>
          3d-art-dun.vercel.app
        </div>
      </div>

      {/* ── Right 3D viewport ── */}
      <div style={{ flex: 1, position: "relative", background: "#0d0d1a" }}>
        {imageCanvas ? (
          <SceneErrorBoundary onReset={() => setImageCanvas(null)}>
            <Scene imageCanvas={imageCanvas} />
          </SceneErrorBoundary>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#475569", textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function EmptyState() {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        border: "2px dashed rgba(109,40,217,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="rgba(109,40,217,0.5)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </div>
      <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Upload an image to see the 3D effect</p>
    </div>
  );
}
