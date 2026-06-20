"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  onReset: () => void;
}
interface State {
  hasError: boolean;
  message: string;
}

export default class SceneErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          background: "#0a0a0f",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <p style={{ color: "#f87171", fontSize: 14 }}>3D scene failed to load.</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: "" }); this.props.onReset(); }}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: "rgba(109,40,217,0.2)", border: "1px solid rgba(109,40,217,0.4)",
              color: "#c4b5fd", fontSize: 13, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
