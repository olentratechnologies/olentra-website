"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import styles from "./services.module.css";

// A continuous, reflective form: separate disciplines resolving into one system.
export default function ServicesSculpture({ active, hero }) {
  const host = useRef(null);
  const selection = useRef(active);
  useEffect(() => {
    selection.current = active;
  }, [active]);
  useEffect(() => {
    const container = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 10.8);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const studio = new RoomEnvironment();
    const environment = pmrem.fromScene(studio, 0.025);
    scene.environment = environment.texture;
    studio.dispose();
    const geometries = [],
      materials = [];
    const geometry = (g) => {
      geometries.push(g);
      return g;
    };
    const material = (options) => {
      const m = new THREE.MeshPhysicalMaterial(options);
      materials.push(m);
      return m;
    };
    const chrome = material({
      color: 0xc3cce3,
      metalness: 1,
      roughness: 0.13,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.7,
    });
    const cobalt = material({
      color: 0x2949dc,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1,
      envMapIntensity: 1.6,
    });
    const accent = material({
      color: 0x9aaaff,
      metalness: 0.8,
      roughness: 0.21,
      emissive: 0x1a36c4,
      emissiveIntensity: 0.08,
    });
    const assembly = new THREE.Group();
    scene.add(assembly);
    const sculpture = new THREE.Group();
    assembly.add(sculpture);
    const knot = new THREE.Mesh(
      geometry(new THREE.TorusKnotGeometry(1.48, 0.47, 256, 28, 2, 3)),
      chrome,
    );
    knot.rotation.set(0.45, -0.2, 0.1);
    sculpture.add(knot);
    // A second continuous ribbon follows the silver form at a smaller radius.
    const inner = new THREE.Mesh(
      geometry(new THREE.TorusKnotGeometry(1.08, 0.24, 192, 20, 2, 3)),
      cobalt,
    );
    inner.rotation.set(0.45, -0.2, 0.1);
    sculpture.add(inner);
    const orbit = new THREE.Group();
    assembly.add(orbit);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x9ca9e8,
      transparent: true,
      opacity: 0.23,
    });
    materials.push(orbitMaterial);
    const orbitGeometry = geometry(
      new THREE.TorusGeometry(2.72, 0.006, 5, 140),
    );
    const ring = new THREE.Mesh(orbitGeometry, orbitMaterial);
    ring.rotation.set(1.1, 0.3, -0.3);
    orbit.add(ring);
    const beadGeometry = geometry(new THREE.SphereGeometry(0.045, 12, 8));
    const points = [];
    for (let i = 0; i < 7; i++) {
      const t = (i / 7) * Math.PI * 2;
      const bead = new THREE.Mesh(beadGeometry, accent);
      bead.position.set(Math.cos(t) * 2.72, Math.sin(t) * 2.72, 0);
      ring.add(bead);
      points.push(bead);
    }
    const key = new THREE.DirectionalLight(0xd4e1ff, 3);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x456aff, 6);
    rim.position.set(4, -1, -1);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffffff, 35, 20);
    fill.position.set(-4, -2, 5);
    scene.add(fill);
    let frame = 0,
      visible = false,
      previous = 0,
      elapsed = 0;
    const pointer = { x: 0, y: 0 };
    function render(time) {
      const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
      previous = time;
      elapsed += delta;
      const easing = 1 - Math.exp(-delta * 2.5);
      const selected = selection.current;
      assembly.rotation.y +=
        (pointer.x * 0.22 + selected * 0.18 - assembly.rotation.y) * easing;
      assembly.rotation.x += (pointer.y * 0.14 - assembly.rotation.x) * easing;
      sculpture.rotation.z = Math.sin(elapsed * 0.15) * 0.08;
      sculpture.rotation.y = elapsed * 0.065;
      inner.rotation.z = 0.1 + Math.sin(elapsed * 0.2) * 0.08;
      assembly.position.y = Math.sin(elapsed * 0.45) * 0.055;
      orbit.rotation.z = elapsed * 0.025;
      points.forEach((point, i) =>
        point.scale.setScalar(i === selected ? 2.1 : 1),
      );
      renderer.render(scene, camera);
      container.dataset.ready = "true";
      frame = requestAnimationFrame(render);
    }
    function updateLoop() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(render);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateLoop();
    });
    observer.observe(container);
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 0.85 ? 12.7 : hero ? 10.6 : 11.1;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    const move = (e) => {
      if (e.pointerType === "touch") return;
      const r = container.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
    };
    const leave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    const lost = (e) => {
      e.preventDefault();
      visible = false;
      updateLoop();
      delete container.dataset.ready;
      renderer.domElement.style.opacity = "0";
    };
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", updateLoop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", updateLoop);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete container.dataset.ready;
    };
  }, [hero]);
  return <div ref={host} className={styles.canvas} />;
}
