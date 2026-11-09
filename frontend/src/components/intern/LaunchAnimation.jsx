"use client";

import { useEffect, useRef, useState } from "react";
import { createRocketExhaust } from "./rocket-exhaust";
import styles from "./LaunchAnimation.module.css";

function RocketFallback() {
  return (
    <svg className={styles.fallback} viewBox="0 0 320 350" aria-hidden="true">
      <defs>
        <linearGradient id="launch-body" x1="0" x2="1">
          <stop stopColor="#c2dcff" />
          <stop offset=".48" stopColor="#fff" />
          <stop offset="1" stopColor="#9dbff7" />
        </linearGradient>
        <linearGradient id="launch-blue" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#48c5ff" />
          <stop offset=".6" stopColor="#0d66ff" />
          <stop offset="1" stopColor="#1237b5" />
        </linearGradient>
        <linearGradient id="launch-flame" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#e5f7ff" />
          <stop offset=".2" stopColor="#fff2a3" />
          <stop offset=".55" stopColor="#ffae28" />
          <stop offset=".85" stopColor="#ff5c19" />
          <stop offset="1" stopColor="#fb4413" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="launch-exhaust-glow">
          <stop stopColor="#ffb347" stopOpacity=".5" />
          <stop offset="1" stopColor="#ff8e32" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="290" rx="82" ry="19" fill="#709fe3" opacity=".13" />
      <ellipse
        cx="160"
        cy="273"
        rx="89"
        ry="24"
        fill="#edf7ff"
        stroke="#bad5fd"
      />
      <ellipse
        cx="160"
        cy="180"
        rx="121"
        ry="48"
        fill="none"
        stroke="#8dc5ff"
        strokeWidth="1"
        transform="rotate(-24 160 180)"
      />
      <g transform="translate(160 167) rotate(17) scale(1.18) translate(-160 -167)">
        <g className={styles.fallbackExhaust}>
          <ellipse
            cx="160"
            cy="238"
            rx="28"
            ry="40"
            fill="url(#launch-exhaust-glow)"
          />
          <path
            d="M143 208Q139 225 149 238L147 248 158 271Q167 258 166 250L176 239Q178 221 177 208Z"
            fill="url(#launch-flame)"
          />
          <path d="M151 210Q148 232 160 250Q172 231 169 210Z" fill="#fff7ce" />
        </g>
        <path
          d="M127 167Q97 190 106 221L139 201M192 167Q222 190 213 221L180 201"
          fill="url(#launch-blue)"
        />
        <path
          d="M133 211Q109 140 139 91Q151 70 160 64Q173 75 183 92Q213 140 187 211Z"
          fill="url(#launch-body)"
        />
        <path
          d="M138 94Q147 72 160 64Q174 76 185 96Q162 105 138 94Z"
          fill="url(#launch-blue)"
        />
        <circle cx="160" cy="144" r="24" fill="#2677e8" />
        <circle
          cx="160"
          cy="144"
          r="17"
          fill="url(#launch-blue)"
          stroke="#ddf6ff"
          strokeWidth="3"
        />
        <path
          d="M151 137Q155 130 164 132"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M135 206Q160 215 186 206L183 216Q161 223 138 216Z"
          fill="#316fda"
        />
      </g>
      <circle cx="54" cy="194" r="7" fill="#4c9cff" />
      <circle cx="265" cy="120" r="5" fill="#8dbdff" />
      <path
        d="M235 65v14m-7-7h14M70 102v9m-4-4h8"
        stroke="#5d9bf4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LaunchAnimation() {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let failed = false;
    let resourcesReleased = false;
    let renderer;
    let scene;
    let frame = 0;
    let resizeObserver;
    let intersectionObserver;
    let removeListeners = () => {};

    function releaseResources() {
      if (resourcesReleased) return;
      resourcesReleased = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      removeListeners();
      const geometries = new Set();
      const materials = new Set();
      scene?.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer?.dispose();
      renderer?.domElement.remove();
    }

    function showFallback() {
      failed = true;
      releaseResources();
      if (!disposed) setReady(false);
    }

    async function initialize() {
      try {
        const THREE = await import("three");
        if (disposed) return;
        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
        camera.position.set(3.2, 1.7, 8.5);
        camera.lookAt(0, -0.15, 0);
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        renderer.domElement.className = styles.canvas;
        renderer.domElement.setAttribute("aria-hidden", "true");
        host.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x87aff7, 3));
        const key = new THREE.DirectionalLight(0xffffff, 5);
        key.position.set(-3, 5, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x6cc9ff, 4);
        rim.position.set(4, 1, -3);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xc0d3ff, 2);
        fill.position.set(-4, -2, 1);
        scene.add(fill);

        const pearl = new THREE.MeshPhysicalMaterial({
          color: 0xf1f7ff,
          metalness: 0.22,
          roughness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.15,
        });
        const blue = new THREE.MeshPhysicalMaterial({
          color: 0x0956ed,
          metalness: 0.4,
          roughness: 0.23,
          clearcoat: 1,
        });
        const silver = new THREE.MeshStandardMaterial({
          color: 0xbcd7ff,
          metalness: 0.7,
          roughness: 0.22,
        });
        const glass = new THREE.MeshPhysicalMaterial({
          color: 0x0275ec,
          metalness: 0.55,
          roughness: 0.12,
          clearcoat: 1,
          emissive: 0x005ab8,
          emissiveIntensity: 0.25,
        });
        const rocket = new THREE.Group();
        rocket.scale.setScalar(1.18);
        rocket.rotation.set(0.04, 0.28, -0.24);
        rocket.position.y = 0.5;
        scene.add(rocket);
        const lathe = (points, material) => {
          const mesh = new THREE.Mesh(
            new THREE.LatheGeometry(
              points.map(([r, y]) => new THREE.Vector2(r, y)),
              64,
            ),
            material,
          );
          rocket.add(mesh);
          return mesh;
        };
        lathe(
          [
            [0, -0.94],
            [0.28, -0.94],
            [0.35, -0.87],
            [0.41, -0.6],
            [0.445, -0.15],
            [0.43, 0.3],
            [0.37, 0.67],
          ],
          pearl,
        );
        lathe(
          [
            [0.37, 0.67],
            [0.33, 0.83],
            [0.24, 1.04],
            [0.13, 1.22],
            [0.025, 1.34],
            [0, 1.36],
          ],
          blue,
        );
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.365, 0.024, 12, 64),
          silver,
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.67;
        rocket.add(collar);
        const nozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.2, 0.2, 48),
          blue,
        );
        nozzle.position.y = -0.99;
        rocket.add(nozzle);
        const nozzleRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.21, 0.025, 12, 48),
          silver,
        );
        nozzleRim.rotation.x = Math.PI / 2;
        nozzleRim.position.y = -1.09;
        rocket.add(nozzleRim);

        const windowGroup = new THREE.Group();
        windowGroup.position.set(0, 0.1, 0.415);
        const windowRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.225, 0.052, 16, 64),
          blue,
        );
        windowGroup.add(windowRim);
        const windowInner = new THREE.Mesh(
          new THREE.TorusGeometry(0.183, 0.018, 12, 64),
          silver,
        );
        windowInner.position.z = 0.024;
        windowGroup.add(windowInner);
        const windowGlass = new THREE.Mesh(
          new THREE.SphereGeometry(0.183, 40, 24),
          glass,
        );
        windowGlass.scale.z = 0.36;
        windowGlass.position.z = 0.023;
        windowGroup.add(windowGlass);
        const glint = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 16, 12),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
          }),
        );
        glint.scale.set(1, 0.45, 0.2);
        glint.rotation.z = 0.6;
        glint.position.set(-0.055, 0.075, 0.085);
        windowGroup.add(glint);
        rocket.add(windowGroup);

        const finShape = new THREE.Shape();
        finShape.moveTo(0.29, -0.3);
        finShape.bezierCurveTo(0.52, -0.45, 0.77, -0.76, 0.77, -1.14);
        finShape.quadraticCurveTo(0.77, -1.26, 0.68, -1.19);
        finShape.lineTo(0.33, -0.93);
        finShape.closePath();
        const finGeometry = new THREE.ExtrudeGeometry(finShape, {
          depth: 0.11,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.045,
          bevelThickness: 0.045,
          curveSegments: 20,
        });
        finGeometry.translate(0, 0, -0.055);
        for (let i = 0; i < 3; i++) {
          const fin = new THREE.Mesh(finGeometry, blue);
          fin.rotation.y = (i * Math.PI * 2) / 3 + Math.PI / 6;
          rocket.add(fin);
        }

        const exhaust = createRocketExhaust(THREE);
        exhaust.group.position.y = -1.09;
        rocket.add(exhaust.group);

        const stage = new THREE.Group();
        stage.position.y = -2.34;
        scene.add(stage);
        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(1.02, 1.12, 0.09, 96),
          new THREE.MeshPhysicalMaterial({
            color: 0xbddaff,
            metalness: 0.25,
            roughness: 0.28,
            transparent: true,
            opacity: 0.52,
            clearcoat: 1,
          }),
        );
        stage.add(platform);
        const platformRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.03, 0.012, 8, 96),
          new THREE.MeshBasicMaterial({
            color: 0x74aaff,
            transparent: true,
            opacity: 0.65,
          }),
        );
        platformRing.rotation.x = Math.PI / 2;
        platformRing.position.y = 0.055;
        stage.add(platformRing);
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.52, 48),
          new THREE.MeshBasicMaterial({
            color: 0x4080dc,
            transparent: true,
            opacity: 0.07,
            depthWrite: false,
          }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.052;
        shadow.scale.y = 0.72;
        stage.add(shadow);

        const orbit = new THREE.Group();
        orbit.rotation.set(0.28, 0, -0.25);
        orbit.position.y = -0.1;
        scene.add(orbit);
        const orbitRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.55, 0.008, 8, 128),
          new THREE.MeshBasicMaterial({
            color: 0x79b3f5,
            transparent: true,
            opacity: 0.42,
          }),
        );
        orbitRing.rotation.x = Math.PI / 2;
        orbit.add(orbitRing);
        const satellite = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 24, 16),
          blue,
        );
        orbit.add(satellite);
        const satellite2 = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.055, 1),
          silver,
        );
        orbit.add(satellite2);
        const stars = new THREE.Group();
        scene.add(stars);
        [
          [-1.18, 0.95, 0.1],
          [1.25, 1.4, -0.2],
          [1.45, -0.8, 0],
          [-1.42, -0.5, -0.4],
        ].forEach(([x, y, z], i) => {
          const star = new THREE.Mesh(
            new THREE.OctahedronGeometry(i === 1 ? 0.065 : 0.04),
            new THREE.MeshStandardMaterial({
              color: i % 2 ? 0x7bb3ff : 0x4f90ed,
              metalness: 0.45,
              roughness: 0.25,
            }),
          );
          star.position.set(x, y, z);
          stars.add(star);
        });

        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let inView = false;
        let elapsed = 0;
        let lastTime = 0;
        const render = () => {
          if (!disposed && !failed) renderer.render(scene, camera);
        };
        const tick = (time) => {
          frame = 0;
          if (
            disposed ||
            failed ||
            motion.matches ||
            !inView ||
            document.hidden
          )
            return;
          if (lastTime) elapsed += Math.min((time - lastTime) / 1000, 0.05);
          lastTime = time;
          const bob = Math.sin(elapsed * 1.65);
          rocket.position.y = 0.5 + bob * 0.24;
          rocket.position.x = Math.sin(elapsed * 0.825) * 0.065;
          rocket.rotation.z = -0.24 + Math.sin(elapsed * 0.825) * 0.06;
          rocket.rotation.y = 0.28 + Math.sin(elapsed * 0.65) * 0.16;
          exhaust.update(elapsed);
          shadow.scale.setScalar(1 - bob * 0.2);
          const angle = elapsed * 0.46 + 2.4;
          satellite.position.set(
            Math.cos(angle) * 1.55,
            0,
            Math.sin(angle) * 1.55,
          );
          satellite2.position.set(
            Math.cos(angle + Math.PI) * 1.55,
            0,
            Math.sin(angle + Math.PI) * 1.55,
          );
          stars.rotation.y = Math.sin(elapsed * 0.2) * 0.12;
          render();
          frame = requestAnimationFrame(tick);
        };
        const syncAnimation = () => {
          cancelAnimationFrame(frame);
          frame = 0;
          lastTime = 0;
          if (disposed || failed) return;
          if (inView && !document.hidden && !motion.matches)
            frame = requestAnimationFrame(tick);
          else if (!disposed) render();
        };
        satellite.position.set(-1.15, 0, 1.04);
        satellite2.position.set(1.15, 0, -1.04);
        resizeObserver = new ResizeObserver(() => {
          const { width, height } = host.getBoundingClientRect();
          if (!width || !height || disposed || failed) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          render();
        });
        resizeObserver.observe(host);
        intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting;
            syncAnimation();
          },
          { rootMargin: "60px" },
        );
        intersectionObserver.observe(host);
        motion.addEventListener("change", syncAnimation);
        document.addEventListener("visibilitychange", syncAnimation);
        const contextLost = (event) => {
          event.preventDefault();
          showFallback();
        };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        removeListeners = () => {
          motion.removeEventListener("change", syncAnimation);
          document.removeEventListener("visibilitychange", syncAnimation);
          renderer.domElement.removeEventListener(
            "webglcontextlost",
            contextLost,
          );
        };
        const { width, height } = host.getBoundingClientRect();
        renderer.setSize(width || 320, height || 350, false);
        camera.aspect = (width || 320) / (height || 350);
        camera.updateProjectionMatrix();
        render();
        setReady(true);
      } catch {
        // A vector illustration keeps the composition intact without WebGL.
        showFallback();
      }
    }
    initialize();
    return () => {
      disposed = true;
      releaseResources();
    };
  }, []);

  return (
    <div className={styles.launch}>
      <div
        className={styles.visual}
        ref={hostRef}
        data-ready={ready}
        aria-hidden="true"
      >
        <div className={styles.halo} />
        {!ready && <RocketFallback />}
        <span className={`${styles.spark} ${styles.sparkOne}`} />
        <span className={`${styles.spark} ${styles.sparkTwo}`} />
      </div>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Your next chapter</span>
        <h3 className={styles.title}>Ready for liftoff.</h3>
        <p className={styles.description}>
          Big ideas. Real experience.
          <br />A future built by you.
        </p>
      </div>
    </div>
  );
}
