"use client";

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const EARTH_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const EARTH_FRAGMENT_SHADER = `
  uniform sampler2D uDataMap;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPosition);

    // Sample packed Earth data map:
    // R = Land mask (1=land, 0=ocean)
    // G = Coastline bevel & topography relief
    // B = Geodesic constellation network lines
    // A = Constellation vertex dots & city lights
    vec4 data = texture2D(uDataMap, vUv);
    float land = smoothstep(0.32, 0.65, data.r);
    float coast = data.g;
    float constellationLine = data.b;
    float nodeDots = data.a;

    // Perturb normal slightly along coastline gradients for 3D embossed continents
    vec2 texel = vec2(1.0 / 2048.0, 1.0 / 1024.0);
    float hRight = texture2D(uDataMap, vUv + vec2(texel.x * 2.2, 0.0)).r;
    float hUp = texture2D(uDataMap, vUv + vec2(0.0, texel.y * 2.2)).r;
    vec3 bumpOffset = vec3((land - hRight) * 1.6, (land - hUp) * 1.6, 0.0);
    vec3 bumpedN = normalize(N + bumpOffset * 0.32);

    // View-locked studio lights matching reference artwork:
    // 1. Upper-left cool cyan/ice-blue key & rim light
    vec3 cyanLightDir = normalize(vec3(-0.82, 0.64, 0.22));
    // 2. Lower-right warm golden-amber key & rim light
    vec3 goldLightDir = normalize(vec3(0.82, -0.64, 0.18));

    float diffCyan = max(dot(bumpedN, cyanLightDir), 0.0);
    float diffGold = max(dot(bumpedN, goldLightDir), 0.0);

    // Concentrate diffuse sheen toward the outer grazing angles so the core stays deep obsidian
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float grazing = pow(1.0 - NdotV, 1.35);

    // Specular highlights (glossier on metallic ocean, dark matte on continents)
    vec3 halfCyan = normalize(cyanLightDir + V);
    vec3 halfGold = normalize(goldLightDir + V);
    float specPower = mix(34.0, 12.0, land);
    float specStrength = mix(0.65, 0.10, land);
    float specCyan = pow(max(dot(bumpedN, halfCyan), 0.0), specPower) * specStrength;
    float specGold = pow(max(dot(bumpedN, halfGold), 0.0), specPower) * specStrength * 0.75;

    // Deep luxury obsidian ocean vs matte carbon continent colors
    vec3 oceanBase = vec3(0.018, 0.036, 0.072);
    vec3 oceanLitCyan = vec3(0.11, 0.30, 0.52);
    vec3 oceanLitGold = vec3(0.18, 0.11, 0.03);

    vec3 landBase = vec3(0.008, 0.012, 0.024);
    vec3 landLitCyan = vec3(0.035, 0.085, 0.16);
    vec3 landLitGold = vec3(0.09, 0.055, 0.015);

    vec3 oceanColor = oceanBase
      + pow(diffCyan, 1.5) * oceanLitCyan * (0.45 + 0.65 * grazing)
      + pow(diffGold, 1.6) * oceanLitGold * (0.35 + 0.65 * grazing)
      + specCyan * vec3(0.48, 0.85, 1.0)
      + specGold * vec3(1.0, 0.72, 0.24);

    vec3 landColor = landBase
      + pow(diffCyan, 1.5) * landLitCyan * 0.65
      + pow(diffGold, 1.6) * landLitGold * 0.65
      + specCyan * vec3(0.28, 0.62, 0.90)
      + specGold * vec3(0.90, 0.62, 0.18);

    vec3 surfaceColor = mix(oceanColor, landColor, land);

    // Coastline 3D bevel highlight catching the studio lights
    float coastHighlight = coast * (diffCyan * 0.55 + diffGold * 0.75 + 0.12);
    vec3 coastColor = mix(
      vec3(0.24, 0.68, 0.96),
      vec3(0.98, 0.72, 0.22),
      smoothstep(-0.25, 0.35, diffGold - diffCyan)
    );
    surfaceColor += coastHighlight * coastColor * 0.34;

    // Constellation network lines & twinkling vertex nodes
    float pulse = 0.75 + 0.25 * sin(uTime * 2.4 + vUv.x * 28.0 + vUv.y * 20.0);
    float goldBias = smoothstep(-0.30, 0.30, N.x - N.y);
    vec3 netColor = mix(vec3(0.30, 0.74, 0.98), vec3(1.0, 0.75, 0.24), goldBias);

    float netVisibility = mix(0.24, 0.62, land) * (0.28 + 0.72 * max(diffCyan, diffGold));
    surfaceColor += constellationLine * netColor * netVisibility * 0.44;

    // Glowing vertex dots & city lights
    float nodeVisibility = (0.38 + 0.62 * max(diffCyan, diffGold)) * pulse;
    surfaceColor += nodeDots * mix(netColor, vec3(1.0, 0.92, 0.68), 0.45) * nodeVisibility * 0.78;

    // Crisp Fresnel Rim Lighting (locked to upper-left Cyan & lower-right Golden-Amber)
    float fresnel = pow(1.0 - NdotV, 3.4);
    float outerRim = pow(1.0 - NdotV, 6.0);

    float cyanRimMask = smoothstep(0.0, 0.78, dot(N.xy, normalize(vec2(-0.76, 0.65))));
    float goldRimMask = smoothstep(0.0, 0.78, dot(N.xy, normalize(vec2(0.76, -0.65))));

    vec3 cyanRimColor = mix(vec3(0.16, 0.66, 0.98), vec3(0.82, 0.96, 1.0), outerRim);
    vec3 goldRimColor = mix(vec3(0.96, 0.58, 0.06), vec3(1.0, 0.95, 0.65), outerRim);

    surfaceColor += fresnel * cyanRimMask * cyanRimColor * 1.55;
    surfaceColor += fresnel * goldRimMask * goldRimColor * 1.65;

    // Subtle dark occlusion behind the central floating medallion
    float centerDist = length(N.xy);
    float centerShadow = smoothstep(0.36, 0.68, centerDist);
    surfaceColor *= mix(0.28, 1.0, centerShadow);

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPosition);
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float halo = pow(1.0 - NdotV, 3.8) * smoothstep(0.0, 0.35, NdotV);

    float cyanMask = smoothstep(0.0, 0.78, dot(N.xy, normalize(vec2(-0.76, 0.65))));
    float goldMask = smoothstep(0.0, 0.78, dot(N.xy, normalize(vec2(0.76, -0.65))));

    vec3 col = cyanMask * vec3(0.20, 0.72, 1.0) * 0.9
             + goldMask * vec3(1.0, 0.66, 0.14) * 1.0;
    float alpha = halo * max(cyanMask, goldMask) * 0.80;

    gl_FragColor = vec4(col, alpha);
  }
`;

const MOON_FRAGMENT_SHADER = `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPosition);

    vec3 cyanLightDir = normalize(vec3(-0.75, 0.68, 0.45));
    vec3 goldLightDir = normalize(vec3(0.75, -0.68, 0.38));

    float diffCyan = max(dot(N, cyanLightDir), 0.0);
    float diffGold = max(dot(N, goldLightDir), 0.0);

    vec3 halfCyan = normalize(cyanLightDir + V);
    vec3 halfGold = normalize(goldLightDir + V);
    float specCyan = pow(max(dot(N, halfCyan), 0.0), 38.0);
    float specGold = pow(max(dot(N, halfGold), 0.0), 30.0);

    float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.8);
    float cyanRim = smoothstep(-0.05, 0.75, dot(N.xy, normalize(vec2(-0.75, 0.65))));
    float goldRim = smoothstep(-0.05, 0.75, dot(N.xy, normalize(vec2(0.75, -0.65))));

    vec3 col = vec3(0.015, 0.022, 0.045)
      + diffCyan * vec3(0.11, 0.24, 0.42)
      + diffGold * vec3(0.26, 0.14, 0.03)
      + specCyan * vec3(0.75, 0.92, 1.0) * 0.85
      + specGold * vec3(1.0, 0.78, 0.32) * 0.75
      + fresnel * cyanRim * vec3(0.35, 0.80, 1.0) * 1.15
      + fresnel * goldRim * vec3(1.0, 0.66, 0.16) * 1.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0.0, 'rgba(255, 253, 235, 1.0)');
  grad.addColorStop(0.22, 'rgba(253, 212, 98, 0.88)');
  grad.addColorStop(0.52, 'rgba(245, 158, 11, 0.34)');
  grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createFallbackDataTexture() {
  const data = new Uint8Array([0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export default function CentralGlobe3D() {
  const mountRef = useRef(null);
  const medallionWrapRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 4.82);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const updateSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width || 275;
      const height = rect.height || 275;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    updateSize();
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Root interactive group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Earth Sphere with Custom Studio GLSL Shader
    const fallbackTex = createFallbackDataTexture();
    const earthUniforms = {
      uDataMap: { value: fallbackTex },
      uTime: { value: 0 },
    };

    const textureLoader = new THREE.TextureLoader();
    let loadedDataTex = null;
    textureLoader.load('/images/capabilities/earth-data-map.png', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      loadedDataTex = tex;
      earthUniforms.uDataMap.value = tex;
    });

    const earthGeo = new THREE.SphereGeometry(1.0, 128, 96);
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERTEX_SHADER,
      fragmentShader: EARTH_FRAGMENT_SHADER,
      uniforms: earthUniforms,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    const earthTiltGroup = new THREE.Group();
    earthTiltGroup.rotation.z = THREE.MathUtils.degToRad(14);
    earthTiltGroup.rotation.x = THREE.MathUtils.degToRad(14);
    earthMesh.rotation.y = -1.45;
    earthTiltGroup.add(earthMesh);
    rootGroup.add(earthTiltGroup);

    // 2. Outer Atmosphere Rim Halo
    const atmosGeo = new THREE.SphereGeometry(1.04, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    rootGroup.add(atmosMesh);

    // 3. True 3D Circular Golden Orbital Ring (Radius 1.36 > Earth 1.0)
    // Tilted with rotation.x = -74.5° so the upper arc passes BEHIND the Earth (z < 0)
    // and the lower arc sweeps IN FRONT of the Earth (z > 0), matching the reference!
    const ORBIT_RADIUS = 1.36;
    const orbitSystemGroup = new THREE.Group();
    orbitSystemGroup.rotation.z = THREE.MathUtils.degToRad(16.5);
    orbitSystemGroup.rotation.x = THREE.MathUtils.degToRad(-74.5);
    rootGroup.add(orbitSystemGroup);

    // Primary golden core ring
    const ringGeo = new THREE.TorusGeometry(ORBIT_RADIUS, 0.011, 24, 200);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fef08a'),
      transparent: true,
      opacity: 0.96,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    orbitSystemGroup.add(ringMesh);

    // Soft golden outer glow tube around primary ring
    const ringGlowGeo = new THREE.TorusGeometry(ORBIT_RADIUS, 0.034, 20, 160);
    const ringGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f59e0b'),
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringGlowMesh = new THREE.Mesh(ringGlowGeo, ringGlowMat);
    orbitSystemGroup.add(ringGlowMesh);

    // Secondary finer orbital filament
    const SEC_ORBIT_RADIUS = 1.30;
    const secondaryOrbitGroup = new THREE.Group();
    secondaryOrbitGroup.rotation.z = THREE.MathUtils.degToRad(13.0);
    secondaryOrbitGroup.rotation.x = THREE.MathUtils.degToRad(-77.5);
    rootGroup.add(secondaryOrbitGroup);

    const secRingGeo = new THREE.TorusGeometry(SEC_ORBIT_RADIUS, 0.0045, 16, 160);
    const secRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fbbf24'),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const secRingMesh = new THREE.Mesh(secRingGeo, secRingMat);
    secondaryOrbitGroup.add(secRingMesh);

    // 4. Orbiting Luminous Golden Energy Pearls along the 3D Orbital Ring
    const glowTex = createGlowTexture();
    const pearlGeo = new THREE.SphereGeometry(0.032, 20, 20);
    const pearlMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fffbeb'),
    });

    const orbitPearls = [
      { angle: -0.35, speed: 0.58, size: 1.25, spriteScale: 0.28 },
      { angle: -2.75, speed: 0.58, size: 1.15, spriteScale: 0.25 },
      { angle: 0.22, speed: 0.58, size: 0.78, spriteScale: 0.17 },
      { angle: 1.65, speed: 0.58, size: 0.72, spriteScale: 0.15 },
    ].map((cfg) => {
      const holder = new THREE.Group();
      const mesh = new THREE.Mesh(pearlGeo, pearlMat);
      mesh.scale.setScalar(cfg.size);
      holder.add(mesh);

      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color('#fbbf24'),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.setScalar(cfg.spriteScale);
      holder.add(sprite);

      orbitSystemGroup.add(holder);
      return { ...cfg, holder, spriteMat };
    });

    // 5. Three 3D Dark Metallic Satellite Moons (matching reference positions & lighting)
    const moonMat = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: MOON_FRAGMENT_SHADER,
    });

    const moonConfigs = [
      // Large dark metallic moon at upper-right (~1 o'clock)
      {
        radius: 0.17,
        basePos: new THREE.Vector3(0.44, 0.96, -0.18),
        bobSpeed: 1.35,
        bobAmp: 0.035,
        orbitAmp: 0.04,
        phase: 0.0,
      },
      // Medium dark metallic moon at lower-left (~7:30 o'clock)
      {
        radius: 0.10,
        basePos: new THREE.Vector3(-0.84, -0.78, 0.25),
        bobSpeed: 1.65,
        bobAmp: 0.03,
        orbitAmp: 0.035,
        phase: 2.1,
      },
      // Small dark metallic moon at far upper-right (~2 o'clock)
      {
        radius: 0.074,
        basePos: new THREE.Vector3(1.06, 0.54, -0.10),
        bobSpeed: 1.9,
        bobAmp: 0.028,
        orbitAmp: 0.03,
        phase: 4.2,
      },
    ];

    const moons = moonConfigs.map((cfg) => {
      const geo = new THREE.SphereGeometry(cfg.radius, 40, 40);
      const mesh = new THREE.Mesh(geo, moonMat);
      mesh.position.copy(cfg.basePos);
      rootGroup.add(mesh);
      return { ...cfg, geo, mesh };
    });

    // Interactive mouse parallax state
    const pointer = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    const handlePointerMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.targetX = nx;
      pointer.targetY = ny;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', updateSize);

    // Animation loop
    let rafId;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      earthUniforms.uTime.value = elapsed;

      // Continuous smooth 3D axial rotation of the Earth
      earthMesh.rotation.y = -1.45 + elapsed * 0.25;

      // Subtle gyroscopic precession on the golden orbital rings
      orbitSystemGroup.rotation.z =
        THREE.MathUtils.degToRad(16.5) + Math.sin(elapsed * 0.65) * 0.025;
      orbitSystemGroup.rotation.x =
        THREE.MathUtils.degToRad(-74.5) + Math.cos(elapsed * 0.5) * 0.02;

      secondaryOrbitGroup.rotation.z =
        THREE.MathUtils.degToRad(13.0) - Math.sin(elapsed * 0.55) * 0.028;

      // Advance glowing golden energy pearls along the 3D circular orbital ring
      orbitPearls.forEach((p, idx) => {
        const theta = p.angle + elapsed * p.speed;
        p.holder.position.set(
          ORBIT_RADIUS * Math.cos(theta),
          ORBIT_RADIUS * Math.sin(theta),
          0
        );
        // Hide additive sprite when the pearl passes directly behind the Earth sphere
        const worldPos = new THREE.Vector3();
        p.holder.getWorldPosition(worldPos);
        const isBehindGlobe =
          worldPos.z < -0.15 && Math.hypot(worldPos.x, worldPos.y) < 0.96;
        p.spriteMat.opacity = isBehindGlobe
          ? 0.0
          : 0.78 + 0.22 * Math.sin(elapsed * 3.5 + idx * 1.7);
      });

      // Float & gently orbit the 3 dark metallic satellite moons
      moons.forEach((m) => {
        const t = elapsed * m.bobSpeed + m.phase;
        m.mesh.position.x = m.basePos.x + Math.cos(t * 0.8) * m.orbitAmp;
        m.mesh.position.y = m.basePos.y + Math.sin(t) * m.bobAmp;
        m.mesh.position.z = m.basePos.z + Math.sin(t * 0.7) * 0.03;
      });

      // Smooth mouse parallax damping
      pointer.currentX += (pointer.targetX - pointer.currentX) * 0.05;
      pointer.currentY += (pointer.targetY - pointer.currentY) * 0.05;

      rootGroup.rotation.y = pointer.currentX * 0.14;
      rootGroup.rotation.x = pointer.currentY * 0.10;

      if (medallionWrapRef.current) {
        const tx = pointer.currentX * 4.5;
        const ty = pointer.currentY * 3.5 + Math.sin(elapsed * 1.8) * 2.0;
        medallionWrapRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', updateSize);
      earthGeo.dispose();
      earthMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ringGlowGeo.dispose();
      ringGlowMat.dispose();
      secRingGeo.dispose();
      secRingMat.dispose();
      pearlGeo.dispose();
      pearlMat.dispose();
      glowTex.dispose();
      fallbackTex.dispose();
      if (loadedDataTex) loadedDataTex.dispose();
      moonMat.dispose();
      moons.forEach((m) => m.geo.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-[220px] h-[220px] sm:w-[245px] sm:h-[245px] xl:w-[275px] xl:h-[275px] flex items-center justify-center select-none">
      {/* Ambient Dual-Color Studio Backlight (Cyan Top-Left + Golden Bottom-Right) */}
      <motion.div
        animate={{
          scale: [1, 1.07, 1],
          opacity: [0.6, 0.88, 0.6],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_28%_28%,rgba(56,189,248,0.24)_0%,rgba(245,158,11,0.22)_58%,transparent_76%)] blur-2xl pointer-events-none"
      />

      {/* Interactive Three.js 3D Rotating Earth + 3D Orbital Ring + 3D Moons */}
      <div
        ref={mountRef}
        className="relative z-10 w-full h-full pointer-events-none"
      />

      {/* Central Floating Golden Medallion & Emblem Overlay */}
      <div
        ref={medallionWrapRef}
        className="absolute z-20 w-[39%] h-[39%] mt-[2%] flex items-center justify-center pointer-events-none will-change-transform"
      >
        {/* Warm pulsing golden aura behind medallion */}
        <motion.div
          animate={{
            scale: [0.96, 1.12, 0.96],
            opacity: [0.45, 0.85, 0.45],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.36)_0%,rgba(245,158,11,0.12)_55%,transparent_75%)] blur-md"
        />

        {/* Rotating specular gold rim sweep */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-[1.5px] rounded-full opacity-75"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(254,240,138,0.85) 45deg, transparent 95deg, transparent 180deg, rgba(56,189,248,0.55) 225deg, transparent 275deg)',
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))',
          }}
        />

        {/* Extracted High-Res Golden Medallion */}
        <div className="relative w-full h-full rounded-full shadow-[0_14px_34px_rgba(0,0,0,0.94)]">
          <Image
            src="/images/capabilities/central-medallion.png"
            alt="Olentra Core Emblem"
            width={376}
            height={376}
            unoptimized
            priority
            className="w-full h-full object-contain"
          />

          {/* Subtle breathing inner flame glow */}
          <motion.div
            animate={{
              opacity: [0.15, 0.45, 0.15],
              scale: [0.92, 1.06, 0.92],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle,rgba(253,224,71,0.45)_0%,rgba(245,158,11,0.15)_50%,transparent_72%)] mix-blend-screen pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
