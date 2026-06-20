"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface SceneProps {
  imageCanvas: HTMLCanvasElement;
  depthMap: Float32Array;
  depthWidth: number;
  depthHeight: number;
}

const SEGMENTS = 256; // mesh resolution
const DEPTH_SCALE = 1.8; // how pronounced the 3D effect is

export default function Scene({ imageCanvas, depthMap, depthWidth, depthHeight }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);

    // ── OrbitControls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.5;
    controls.maxDistance = 8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    // ── Texture from uploaded image ───────────────────────────────────────────
    const texture = new THREE.CanvasTexture(imageCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // ── Displaced plane geometry ──────────────────────────────────────────────
    const imgW = imageCanvas.width;
    const imgH = imageCanvas.height;
    const aspect = imgW / imgH;

    const geometry = new THREE.PlaneGeometry(2 * aspect, 2, SEGMENTS, SEGMENTS);
    const positions = geometry.attributes.position;

    // Sample depth map for each vertex
    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const idx = i * (SEGMENTS + 1) + j;

        // UV in [0,1]
        const u = j / SEGMENTS;
        const v = i / SEGMENTS;

        // Sample depth map (bilinear)
        const dx = u * (depthWidth - 1);
        const dy = (1 - v) * (depthHeight - 1);
        const xi = Math.floor(dx), yi = Math.floor(dy);
        const xf = dx - xi, yf = dy - yi;

        const s = (x: number, y: number) =>
          depthMap[Math.min(y, depthHeight - 1) * depthWidth + Math.min(x, depthWidth - 1)];

        const depth =
          s(xi, yi) * (1 - xf) * (1 - yf) +
          s(xi + 1, yi) * xf * (1 - yf) +
          s(xi, yi + 1) * (1 - xf) * yf +
          s(xi + 1, yi + 1) * xf * yf;

        positions.setZ(idx, depth * DEPTH_SCALE);
      }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-2, -1, 2);
    scene.add(fillLight);

    // ── Render loop ───────────────────────────────────────────────────────────
    let rafId = 0;
    const render = () => {
      rafId = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [imageCanvas, depthMap, depthWidth, depthHeight]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Controls hint */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 12,
        background: "rgba(10,10,20,0.7)", backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10, padding: "8px 16px",
        fontSize: 11, color: "#475569",
      }}>
        <span>🖱 Drag to rotate</span>
        <span>·</span>
        <span>Scroll to zoom</span>
        <span>·</span>
        <span>Auto-rotating</span>
      </div>
    </div>
  );
}
