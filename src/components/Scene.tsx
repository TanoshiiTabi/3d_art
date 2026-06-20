"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

const GRID = 8;
const COUNT = GRID * GRID;
const TILE_SIZE = 0.88;
const GAP = 1.0;
const SCATTER_Z = -16;

const vertexShader = /* glsl */ `
  attribute vec2 uvOffset;
  varying vec2 vUv;
  void main() {
    float tileSize = 1.0 / 8.0;
    vUv = uvOffset + uv * tileSize;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

interface SceneProps {
  imageCanvas: HTMLCanvasElement;
}

export default function Scene({ imageCanvas }: SceneProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Play animation helper — defined with useRef so it's stable
  const playFn = useRef<() => void>(() => {});

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0d0d1a);
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // ── Texture ───────────────────────────────────────────────────────────────
    const texture = new THREE.CanvasTexture(imageCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // ── Per-instance data ─────────────────────────────────────────────────────
    const uvOffsets = new Float32Array(COUNT * 2);
    const targets: THREE.Matrix4[] = [];
    const scatters: THREE.Matrix4[] = [];
    const span = (GRID - 1) * GAP;

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const i = row * GRID + col;
        uvOffsets[i * 2] = col / GRID;
        uvOffsets[i * 2 + 1] = (GRID - 1 - row) / GRID;

        targets.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(col * GAP - span / 2, row * GAP - span / 2, 0),
            new THREE.Quaternion(),
            new THREE.Vector3(1, 1, 1)
          )
        );

        scatters.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(
              (Math.random() - 0.5) * span * 2.5,
              (Math.random() - 0.5) * span * 2.5,
              SCATTER_Z + Math.random() * 8
            ),
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(
                (Math.random() - 0.5) * Math.PI * 2,
                (Math.random() - 0.5) * Math.PI * 2,
                (Math.random() - 0.5) * Math.PI
              )
            ),
            new THREE.Vector3(1, 1, 1)
          )
        );
      }
    }

    // ── Mesh ──────────────────────────────────────────────────────────────────
    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    geometry.setAttribute("uvOffset", new THREE.InstancedBufferAttribute(uvOffsets, 2));

    const material = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: texture } },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.frustumCulled = false;
    scene.add(mesh);

    // Init scatter positions
    for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, scatters[i]);
    mesh.instanceMatrix.needsUpdate = true;

    // ── Scratch objects ───────────────────────────────────────────────────────
    const posA = new THREE.Vector3(), posB = new THREE.Vector3();
    const quatA = new THREE.Quaternion(), quatB = new THREE.Quaternion();
    const scaleA = new THREE.Vector3();
    const tmp = new THREE.Matrix4();

    // ── Render loop ───────────────────────────────────────────────────────────
    let rafId = 0;
    const render = () => {
      rafId = requestAnimationFrame(render);
      const t = progressRef.current;
      const p = t * t * (3 - 2 * t);

      for (let i = 0; i < COUNT; i++) {
        scatters[i].decompose(posA, quatA, scaleA);
        targets[i].decompose(posB, quatB, scaleA);
        posA.lerp(posB, p);
        quatA.slerp(quatB, p);
        tmp.compose(posA, quatA, scaleA);
        mesh.setMatrixAt(i, tmp);
      }
      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };
    render();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── Play helper ───────────────────────────────────────────────────────────
    playFn.current = () => {
      tweenRef.current?.kill();
      progressRef.current = 0;
      setSliderVal(0);
      setIsPlaying(true);
      tweenRef.current = gsap.to(progressRef, {
        current: 1,
        duration: 2.4,
        ease: "power2.inOut",
        onUpdate: () => setSliderVal(Math.round(progressRef.current * 100)),
        onComplete: () => setIsPlaying(false),
      });
    };

    // Auto-play on mount
    setTimeout(() => playFn.current(), 300);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      tweenRef.current?.kill();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCanvas]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    tweenRef.current?.kill();
    setIsPlaying(false);
    progressRef.current = Number(e.target.value) / 100;
    setSliderVal(Number(e.target.value));
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Three.js canvas mount point */}
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />

      {/* Controls overlay */}
      <div style={{
        position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        background: "rgba(10,10,20,0.75)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "14px 20px", minWidth: 280,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <span style={{ fontSize: 10, color: "#475569", width: 28 }}>0%</span>
          <input
            type="range" min={0} max={100} value={sliderVal}
            onChange={handleSlider}
            style={{ flex: 1, accentColor: "#7c3aed", cursor: "pointer" }}
          />
          <span style={{ fontSize: 10, color: "#475569", width: 32, textAlign: "right" }}>{sliderVal}%</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => playFn.current()}
            style={{
              padding: "7px 18px", borderRadius: 8, cursor: "pointer",
              background: isPlaying ? "rgba(109,40,217,0.15)" : "rgba(109,40,217,0.8)",
              border: "1px solid rgba(109,40,217,0.5)",
              color: "#fff", fontSize: 12, fontWeight: 600,
            }}
          >
            {isPlaying ? "▶ Playing…" : "▶ Replay"}
          </button>
          <button
            onClick={() => {
              tweenRef.current?.kill();
              setIsPlaying(false);
              progressRef.current = 0;
              setSliderVal(0);
            }}
            style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8", fontSize: 12,
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  );
}
