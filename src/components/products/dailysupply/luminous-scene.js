import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================================================
// RING ANIMATION SCALE
// Adjust this single value to increase or decrease the ring size whenever needed:
// e.g. 0.82 (current), 0.95 (bigger), 1.1 (much bigger), 0.7 (smaller)
// ============================================================================
export const RING_SCALE = 1;

// Elliptical ribbon geometry tailored to snugly frame the Daily Supply logo badge
function ribbonGeometry(radiusX, radiusY, width, phase, segments) {
  const positions = [], colors = [], indices = [];
  const blue = new THREE.Color('#286bff');
  const violet = new THREE.Color('#6456ff');
  const ice = new THREE.Color('#a8d7ff');
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * Math.PI * 2;
    const taper = Math.pow(Math.sin(Math.PI * t), 0.6);
    const color = blue.clone().lerp(violet, (Math.sin(a + phase) + 1) / 2).lerp(ice, Math.pow(Math.max(0, Math.cos(a * 2 + phase)), 10) * .65);
    color.multiplyScalar(2.6);
    for (const side of [-1, 1]) {
      const rx = radiusX + side * width * taper * .5;
      const ry = radiusY + side * width * taper * .5;
      positions.push(
        Math.cos(a) * rx,
        Math.sin(a) * ry,
        Math.sin(a * 2 + phase) * .1 + side * width * taper * Math.sin(a + phase) * .5
      );
      colors.push(color.r, color.g, color.b);
    }
    if (i < segments) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function createLuminousScene(host, { onFailure, onConverged, capture = false }) {
  const mobile = () => host.clientWidth < 768;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 60);
  camera.position.z = 9.5;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: capture, powerPreference: 'low-power' });
  renderer.setClearColor(0x050608, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile() ? 0 : 4 });
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, .7, .35);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);

  const root = new THREE.Group();
  root.rotation.set(.32, -.22, -.18);
  root.position.y = 0;
  scene.add(root);

  const strips = [];
  const stripCount = 7;
  for (let i = 0; i < stripCount; i++) {
    const rx = 2.4 + i * .08;
    const ry = 0.92 + i * .035;
    const mesh = new THREE.Mesh(
      ribbonGeometry(rx, ry, i % 3 === 0 ? .045 : .015, i * .55, mobile() ? 150 : 260),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: i < 4 ? .85 : .42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    mesh.rotation.set(i * .025, i * .035, i * .1);
    root.add(mesh);
    strips.push(mesh);
  }

  let convergedFired = false;
  const state = { reveal: 0, cameraZ: 9.5 };
  const timeline = gsap.timeline({
    paused: true,
    onComplete: () => {
      if (!convergedFired) {
        convergedFired = true;
        onConverged?.();
      }
    }
  });

  timeline.to(state, {
    reveal: 1,
    duration: 2.7,
    ease: 'power3.inOut',
  }, 0)
    .to(state, {
      cameraZ: 8.2,
      duration: 3.0,
      ease: 'power2.out',
    }, 0)
    .to(bloom, {
      strength: 1.55,
      duration: 0.35,
      ease: 'power2.out',
    }, 2.4)
    .to(bloom, {
      strength: mobile() ? 0.8 : 1.05,
      duration: 0.55,
      ease: 'power2.inOut',
    }, 2.75);

  let visible = true, documentVisible = !document.hidden, paused = false, reduced = false, disposed = false, failed = false;
  let frame = 0, lastTime = 0, elapsed = 0, samples = 0, slowFrames = 0, degraded = false;
  const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();

  function updateRingCenter() {
    if (disposed) return;
    const section = host.closest('section');
    if (!section) return;
    const targetElement = section.querySelector('[data-ring-target="true"]') || section.querySelector('h1');
    if (!targetElement) return;

    const hostRect = host.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    if (hostRect.height <= 0 || hostRect.width <= 0) return;

    const targetCenterY = (targetRect.top + targetRect.height / 2) - hostRect.top;
    const targetCenterX = (targetRect.left + targetRect.width / 2) - hostRect.left;

    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * camera.position.z * Math.tan(vFovRad / 2);
    const visibleWidth = visibleHeight * (hostRect.width / hostRect.height);

    const worldY = ((hostRect.height / 2) - targetCenterY) / hostRect.height * visibleHeight;
    const worldX = (targetCenterX - (hostRect.width / 2)) / hostRect.width * visibleWidth;

    // Size the orbit against its layout slot, not the full viewport height.
    // This keeps it around the logo at different viewport sizes and browser zooms.
    const stage = section.querySelector('[data-ring-stage="true"]');
    if (stage) {
      const stageRect = stage.getBoundingClientRect();
      const diameter = stageRect.width * .94;
      root.scale.setScalar((diameter / hostRect.height) * visibleHeight / 5.76 * RING_SCALE);
    }

    root.position.y = worldY;
    root.position.x = worldX;
  }

  function draw(delta = 0) {
    elapsed = capture ? elapsed + delta : Math.min(elapsed + delta, 3.3);
    const motionTime = elapsed <= 3.3 ? elapsed : 3.3 + Math.sin((elapsed - 3.3) / 6 * Math.PI * 2);
    timeline.time(Math.min(elapsed, timeline.duration()), false);
    camera.position.z = state.cameraZ;
    updateRingCenter();

    smoothPointer.lerp(pointer, .035);

    const spread = 1 - state.reveal;
    const easeSpread = Math.pow(spread, 1.4);

    // Subtle gentle floating loop for root — stays centered and keeps its iconic framing tilt
    root.rotation.y = -.22 + Math.sin(motionTime * 0.5) * 0.025 + 0;
    root.rotation.x = .32 + Math.cos(motionTime * 0.4) * 0.02 + 0;
    root.rotation.z = -.18 + Math.sin(motionTime * 0.35) * 0.015;


    // Harmonic looping wave: subtle flex and breath that loops seamlessly without ever losing shape
    strips.forEach((mesh, i) => {
      const direction = i % 2 ? 1 : -1;
      const loopPhase = motionTime * 0.9 + i * 0.5;

      mesh.position.x = direction * easeSpread * 4.4;
      mesh.position.y = Math.sin(i * 1.3 + motionTime * 0.4) * easeSpread * 0.5;
      mesh.position.z = Math.cos(i * 1.1) * easeSpread * 1.3 + Math.sin(loopPhase * 1.1) * 0.035;

      // Small bounded oscillation in a closed periodic loop (~1.7 deg): moves gracefully without spinning away
      mesh.rotation.z = i * .08 + direction * easeSpread * 2.2 + Math.sin(loopPhase) * 0.03;
      mesh.rotation.x = i * .025 + Math.sin(i + motionTime * 0.25) * easeSpread * 0.25 + Math.cos(loopPhase * 0.8) * 0.015;
      mesh.rotation.y = i * .035 + direction * easeSpread * 0.2 + Math.sin(loopPhase * 0.7) * 0.015;

      // Subtle breathing scale pulse
      const breath = 1 + Math.sin(loopPhase * 0.9) * 0.012;
      mesh.scale.set(breath, breath, 1);
    });

    if (state.reveal >= 0.98) {
      // Gentle luminous glow pulse so the combined ring continues to shine brilliantly
      const pulse = Math.sin(motionTime * 1.6) * 0.05;
      bloom.strength = 1.1 + pulse;
    }

    composer.render();
  }

  function running() { return elapsed < 3.3 && !capture && !disposed && !failed && visible && documentVisible && !paused && !reduced; }

  function tick(time) {
    frame = 0;
    if (!running()) return;
    const ms = lastTime ? time - lastTime : 16;
    lastTime = time;
    if (elapsed > 3.5 && samples < 120) { samples++; if (ms > 28) slowFrames++; }
    if (samples === 120 && slowFrames > 45 && !degraded) { degraded = true; resize(); }
    draw(Math.min(ms / 1000, .05));
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
    if (running()) frame = requestAnimationFrame(tick);
  }

  function resize() {
    if (disposed || failed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const ratio = capture ? 1 : Math.min(window.devicePixelRatio, mobile() || degraded ? 1 : 1.5);
    renderer.setPixelRatio(ratio); composer.setPixelRatio(ratio);
    renderer.setSize(width, height); composer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();

    const heroSection = host.closest('section');
    if (heroSection) {
      heroSection.style.setProperty('--ring-scale', String(RING_SCALE));
    }

    const responsiveFactor = mobile() ? 0.58 : width < 1000 ? 0.78 : 0.95;
    root.scale.setScalar(RING_SCALE * responsiveFactor);
    bloom.strength = mobile() ? .8 : 1.05;
    updateRingCenter();
    draw();
  }

  function move(event) {
    if (mobile() || !window.matchMedia('(pointer: fine)').matches || paused || reduced) return;
    const rect = host.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
  }

  function leave() { pointer.set(0, 0); }
  function contextLost(event) { event.preventDefault(); failed = true; sync(); onFailure(); }

  const hero = host.closest('section');
  hero.addEventListener('pointermove', move); hero.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize(); sync();

  return {
    renderAt(time) { elapsed = time; draw(); return renderer.domElement.toDataURL("image/png"); },
    setPaused(value) { paused = value; sync(); },
    setVisible(value) { visible = value; sync(); },
    setDocumentVisible(value) { documentVisible = value; sync(); },
    setReduced(value) {
      reduced = value;
      if (value) {
        elapsed = Math.max(elapsed, 3.5);
        state.reveal = 1;
        if (!convergedFired) {
          convergedFired = true;
          onConverged?.();
        }
        pointer.set(0, 0);
        draw();
      }
      sync();
    },
    dispose() {
      disposed = true; sync(); timeline.kill(); resizeObserver.disconnect();
      hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) object.material.dispose(); });
      bloom.dispose(); output.dispose(); renderPass.dispose(); composer.dispose(); renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.remove();
      }
    },
  };
}
