"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

// ─── Fragments ────────────────────────────────────────────────────────────────
interface FragmentsProps {
  texture: THREE.CanvasTexture;
  progress: React.MutableRefObject<number>;
}

function Fragments({ texture, progress }: FragmentsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { camera } = useThree();

  const { uvOffsets, targets, scatters } = useMemo(() => {
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
    return { uvOffsets, targets, scatters };
  }, []);

  useEffect(() => {
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.setAttribute(
      "uvOffset",
      new THREE.InstancedBufferAttribute(uvOffsets, 2)
    );
    for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, scatters[i]);
    mesh.instanceMatrix.needsUpdate = true;
  }, [uvOffsets, scatters]);

  const scratch = useRef({
    posA: new THREE.Vector3(), posB: new THREE.Vector3(),
    quatA: new THREE.Quaternion(), quatB: new THREE.Quaternion(),
    scaleA: new THREE.Vector3(), tmp: new THREE.Matrix4(),
  });

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { posA, posB, quatA, quatB, scaleA, tmp } = scratch.current;
    const t = progress.current;
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
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE), []);
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: texture } },
      vertexShader, fragmentShader,
      side: THREE.DoubleSide,
    }),
    [texture]
  );

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} frustumCulled={false} />
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────
interface SceneProps {
  imageCanvas: HTMLCanvasElement;
}

export default function Scene({ imageCanvas }: SceneProps) {
  const progress = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(imageCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageCanvas]);

  const playAnimation = () => {
    tweenRef.current?.kill();
    progress.current = 0;
    setSliderVal(0);
    setIsPlaying(true);
    tweenRef.current = gsap.to(progress, {
      current: 1,
      duration: 2.4,
      ease: "power2.inOut",
      onUpdate: () => setSliderVal(Math.round(progress.current * 100)),
      onComplete: () => setIsPlaying(false),
    });
  };

  // Auto-play when image loads
  useEffect(() => {
    const id = setTimeout(playAnimation, 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCanvas]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    tweenRef.current?.kill();
    setIsPlaying(false);
    const v = Number(e.target.value) / 100;
    progress.current = v;
    setSliderVal(Number(e.target.value));
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "default" }}
        dpr={[1, 1.5]}
        camera={{ fov: 60, near: 0.1, far: 200 }}
        style={{ background: "#0d0d1a" }}
      >
        <Fragments texture={texture} progress={progress} />
      </Canvas>

      {/* Controls overlay */}
      <div style={{
        position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        background: "rgba(10,10,20,0.75)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "14px 20px", minWidth: 260,
      }}>
        {/* Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <span style={{ fontSize: 10, color: "#475569", width: 28 }}>0%</span>
          <input
            type="range" min={0} max={100} value={sliderVal}
            onChange={handleSlider}
            style={{ flex: 1, accentColor: "#7c3aed", cursor: "pointer" }}
          />
          <span style={{ fontSize: 10, color: "#475569", width: 28, textAlign: "right" }}>100%</span>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={playAnimation}
            style={{
              padding: "7px 18px", borderRadius: 8, cursor: "pointer",
              background: isPlaying ? "rgba(109,40,217,0.15)" : "rgba(109,40,217,0.8)",
              border: "1px solid rgba(109,40,217,0.5)",
              color: "#fff", fontSize: 12, fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {isPlaying ? "▶ Playing…" : "▶ Replay"}
          </button>
          <button
            onClick={() => {
              tweenRef.current?.kill();
              setIsPlaying(false);
              progress.current = 0;
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
