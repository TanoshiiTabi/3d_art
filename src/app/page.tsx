"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Uploader from "@/components/Uploader";
import CodeExporter from "@/components/CodeExporter";

const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#6d28d9", fontSize: 14, letterSpacing: "0.05em" }}>Loading WebGL…</div>
    </div>
  ),
});

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleImageLoad = useCallback((url: string) => {
    setImageUrl(url);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>

      {/* ── When image is uploaded: sticky canvas + scroll space ── */}
      {imageUrl ? (
        <>
          {/* Fixed 3D canvas behind everything */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 0,
          }}>
            <Scene imageUrl={imageUrl} />
          </div>

          {/* Tall scroll container */}
          <div style={{ position: "relative", zIndex: 10, minHeight: "300vh" }}>

            {/* Sticky top panel */}
            <div style={{
              position: "sticky", top: 0,
              display: "flex", flexDirection: "column", alignItems: "center",
              paddingTop: 32, paddingBottom: 24, paddingLeft: 16, paddingRight: 16,
              pointerEvents: "none",
            }}>
              {/* Glass card */}
              <div style={{
                pointerEvents: "auto",
                width: "100%", maxWidth: 520,
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(10,10,20,0.82)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "28px 32px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
              }}>
                <Title />
                <Uploader onImageLoad={handleImageLoad} />
                <ScrollHint />
              </div>

              {/* Code exporter below card */}
              <div style={{ pointerEvents: "auto", marginTop: 16, width: "100%", maxWidth: 520 }}>
                <CodeExporter imageUrl={imageUrl} />
              </div>
            </div>

            {/* Scroll milestone badges */}
            <div style={{
              position: "absolute", top: "110vh", left: "50%", transform: "translateX(-50%)",
              pointerEvents: "none",
            }}>
              <Badge text="Fragments assembling…" accent={false} />
            </div>
            <div style={{
              position: "absolute", top: "200vh", left: "50%", transform: "translateX(-50%)",
              pointerEvents: "none",
            }}>
              <Badge text="✦ Image fully restored" accent />
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state: full-screen hero ── */
        <div style={{
          minHeight: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, gap: 40,
        }}>
          {/* Animated background orbs */}
          <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
            <div style={{
              position: "absolute", width: 600, height: 600,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)",
              top: "10%", left: "50%", transform: "translateX(-50%)",
            }} />
            <div style={{
              position: "absolute", width: 400, height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
              bottom: "10%", right: "15%",
            }} />
          </div>

          {/* Hero card */}
          <div style={{
            position: "relative", zIndex: 1,
            width: "100%", maxWidth: 560,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(15,15,28,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            padding: "40px 40px 36px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
            boxShadow: "0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <Title />

            {/* Feature chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {["React Three Fiber", "GSAP ScrollTrigger", "instancedMesh", "Custom Shader"].map((t) => (
                <span key={t} style={{
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(109,40,217,0.15)", border: "1px solid rgba(109,40,217,0.3)",
                  color: "#c4b5fd", fontSize: 12, letterSpacing: "0.02em",
                }}>
                  {t}
                </span>
              ))}
            </div>

            <Uploader onImageLoad={handleImageLoad} />

            {/* Instruction steps */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["01", "Upload any photo"],
                ["02", "Scroll down — watch 64 3D shards fly in from the depths and lock together"],
                ["03", 'Click "View Generated Code" to copy the ready-to-use R3F component'],
              ].map(([num, text]) => (
                <div key={num} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.4)",
                    color: "#a78bfa", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>{num}</span>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Title() {
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{
        margin: 0,
        fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em",
        background: "linear-gradient(135deg, #a78bfa, #f0abfc, #67e8f9)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        3D Fragment FX
      </h1>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
        Upload · Scroll-driven 3D shard assembly · Export code
      </p>
    </div>
  );
}

function ScrollHint() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#475569" }}>Scroll down to preview</span>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2} style={{ animation: "bounce 1.5s infinite" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }`}</style>
    </div>
  );
}

function Badge({ text, accent }: { text: string; accent: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "8px 20px", borderRadius: 999,
      background: accent ? "rgba(109,40,217,0.12)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${accent ? "rgba(109,40,217,0.3)" : "rgba(255,255,255,0.08)"}`,
      color: accent ? "#c4b5fd" : "#64748b",
      fontSize: 14,
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    }}>
      {text}
    </span>
  );
}
