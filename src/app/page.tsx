"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Uploader from "@/components/Uploader";
import SceneErrorBoundary from "@/components/SceneErrorBoundary";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

type DepthResult = {
  depthMap: Float32Array;
  depthWidth: number;
  depthHeight: number;
};

type AppState =
  | { stage: "idle" }
  | { stage: "processing"; message: string }
  | { stage: "ready"; imageCanvas: HTMLCanvasElement; depth: DepthResult }
  | { stage: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ stage: "idle" });
  const workerRef = useRef<Worker | null>(null);

  const handleImageReady = useCallback((canvas: HTMLCanvasElement) => {
    // Terminate any previous worker
    workerRef.current?.terminate();

    setState({ stage: "processing", message: "Loading AI model…" });

    const worker = new Worker(new URL("../workers/depth.worker.ts", import.meta.url));
    workerRef.current = worker;

    // Convert canvas to data URL to send to worker
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "status") {
        setState({ stage: "processing", message: msg.message });
      } else if (msg.type === "done") {
        setState({
          stage: "ready",
          imageCanvas: canvas,
          depth: {
            depthMap: msg.depthMap,
            depthWidth: msg.width,
            depthHeight: msg.height,
          },
        });
        worker.terminate();
      } else if (msg.type === "error") {
        setState({ stage: "error", message: msg.message });
        worker.terminate();
      }
    };

    worker.postMessage({ imageDataUrl: dataUrl });
  }, []);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#0a0a0f", color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* ── Left panel ── */}
      <div style={{
        width: 300, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(10,10,20,0.95)",
      }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 style={{
            margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #a78bfa, #f0abfc, #67e8f9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            2D → 3D Converter
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>
            AI depth estimation · Three.js mesh
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <Label>Upload Image</Label>
          <div style={{ marginBottom: 20 }}>
            <Uploader onImageReady={handleImageReady} />
          </div>

          <Label>How it works</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {[
              ["01", "Upload any photo"],
              ["02", "AI (Depth Anything v2) analyses the scene and builds a depth map"],
              ["03", "Three.js displaces a 256×256 mesh using the depth data"],
              ["04", "Rotate, zoom and explore the 3D result"],
            ].map(([n, t]) => (
              <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.35)",
                  color: "#a78bfa", fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{n}</span>
                <span style={{ color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>

          <Label>Model</Label>
          <div style={{
            padding: "10px 12px", borderRadius: 10,
            background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.2)",
            fontSize: 11, color: "#7c3aed", lineHeight: 1.6,
          }}>
            <strong style={{ color: "#a78bfa" }}>Depth Anything V2 Small</strong><br />
            Runs entirely in your browser via WebAssembly.<br />
            First run downloads ~50 MB model (cached after).
          </div>
        </div>

        <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#334155" }}>
          3d-art-dun.vercel.app
        </div>
      </div>

      {/* ── Right viewport ── */}
      <div style={{ flex: 1, position: "relative", background: "#0d0d1a" }}>
        {state.stage === "idle" && <EmptyState />}

        {state.stage === "processing" && (
          <LoadingState message={state.message} />
        )}

        {state.stage === "error" && (
          <ErrorState message={state.message} onRetry={() => setState({ stage: "idle" })} />
        )}

        {state.stage === "ready" && (
          <SceneErrorBoundary onReset={() => setState({ stage: "idle" })}>
            <Scene
              imageCanvas={state.imageCanvas}
              depthMap={state.depth.depthMap}
              depthWidth={state.depth.depthWidth}
              depthHeight={state.depth.depthHeight}
            />
          </SceneErrorBoundary>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#475569", textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function EmptyState() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, border: "2px dashed rgba(109,40,217,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="rgba(109,40,217,0.5)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </div>
      <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>Upload an image to generate a 3D model</p>
      <p style={{ color: "#1e293b", fontSize: 11, margin: 0 }}>First run downloads ~50 MB AI model</p>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {/* Spinner */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: "3px solid rgba(109,40,217,0.2)",
        borderTop: "3px solid #7c3aed",
        animation: "spin 0.9s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#a78bfa", fontSize: 14, margin: "0 0 4px", fontWeight: 600 }}>{message}</p>
        <p style={{ color: "#334155", fontSize: 11, margin: 0 }}>This may take 30–60 seconds on first run</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>Failed to process image</p>
      <p style={{ color: "#475569", fontSize: 12, margin: 0, textAlign: "center", maxWidth: 360 }}>{message}</p>
      <button onClick={onRetry} style={{
        padding: "8px 20px", borderRadius: 8, cursor: "pointer",
        background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.4)",
        color: "#c4b5fd", fontSize: 13,
      }}>Try again</button>
    </div>
  );
}
