"use client";

import { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const GRID = 8;
const COUNT = GRID * GRID;
const TILE_SIZE = 0.88;
const GAP = 1.0;
const SCATTER_Z = -18;

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
  scrollProgress: React.MutableRefObject<number>;
}

function Fragments({ texture, scrollProgress }: FragmentsProps) {
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
              SCATTER_Z + Math.random() * 10
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
    posA: new THREE.Vector3(),
    posB: new THREE.Vector3(),
    quatA: new THREE.Quaternion(),
    quatB: new THREE.Quaternion(),
    scaleA: new THREE.Vector3(),
    tmp: new THREE.Matrix4(),
  });

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { posA, posB, quatA, quatB, scaleA, tmp } = scratch.current;
    const t = scrollProgress.current;
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
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTexture: { value: texture } },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
      }),
    [texture]
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      frustumCulled={false}
    />
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────
interface SceneProps {
  imageCanvas: HTMLCanvasElement;
}

export default function Scene({ imageCanvas }: SceneProps) {
  const scrollProgress = useRef(0);

  // Build CanvasTexture directly — no URL, no async loading
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(imageCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageCanvas]);

  useEffect(() => {
    // Give the DOM a tick to render the 300vh container before measuring
    const id = setTimeout(() => {
      ScrollTrigger.refresh();
      const trigger = ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollProgress.current = self.progress;
        },
      });
      return () => trigger.kill();
    }, 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "default" }}
        dpr={[1, 1.5]}
        camera={{ fov: 60, near: 0.1, far: 200 }}
        style={{ background: "#0a0a0f" }}
      >
        <Fragments texture={texture} scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}
