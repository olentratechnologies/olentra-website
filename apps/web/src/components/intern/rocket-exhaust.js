// Procedural exhaust needs no image textures and shares the scene's cleanup.
export function createRocketExhaust(THREE) {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uLength: { value: 1.03 },
    uCore: { value: 0 },
  };
  const noise = `
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.13, 0.31, 0.57));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
  `;
  const vertexShader = `
    uniform float uTime;
    uniform float uLength;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vLength;
    ${noise}
    void main() {
      vec3 p = position;
      float t = clamp(-p.y / uLength, 0.0, 1.0);
      float turbulence = noise(vec3(p.xz * 25.0, t * 11.0 - uTime * 9.0));
      float freedom = smoothstep(0.0, 0.8, t);
      p.xz *= 1.0 + (turbulence - 0.5) * 0.5 * freedom;
      float curl = 1.0 + smoothstep(0.45, 1.0, t) * 0.8;
      p.x += sin(t * 15.0 - uTime * 13.0) * 0.022 * freedom * curl;
      p.z += cos(t * 17.0 - uTime * 11.0) * 0.018 * freedom * curl;
      p.y -= freedom * (0.022 * sin(uTime * 17.0 + t * 9.0));
      vPosition = p;
      vLength = t;
      vNormal = normalize(normalMatrix * normal);
      vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
      vView = -viewPosition.xyz;
      gl_Position = projectionMatrix * viewPosition;
    }
  `;
  const fragmentShader = `
    uniform float uTime;
    uniform float uCore;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vLength;
    ${noise}
    void main() {
      float flow = noise(vec3(vPosition.xz * 32.0, vLength * 16.0 - uTime * 12.0));
      float detail = noise(vec3(vPosition.xz * 65.0, vLength * 31.0 - uTime * 19.0));
      float facing = pow(abs(dot(normalize(vNormal), normalize(vView))), 0.6);
      float heat = clamp(facing * 0.7 + flow * 0.3 - vLength * 0.28, 0.0, 1.0);
      vec3 amber = mix(vec3(1.0, 0.19, 0.012), vec3(1.0, 0.62, 0.045), heat);
      vec3 hot = mix(amber, vec3(1.0, 0.97, 0.72), smoothstep(0.35, 0.85, heat));
      hot = mix(hot, vec3(0.48, 0.76, 1.0), (1.0 - smoothstep(0.0, 0.12, vLength)) * 0.72);
      hot = mix(hot, vec3(1.0, 0.98, 0.85), uCore * 0.88);
      float tip = 1.0 - smoothstep(0.77, 1.0, vLength + (flow - 0.5) * 0.18);
      float streak = mix(0.70, 1.0, flow * 0.7 + detail * 0.3);
      float alpha = tip * streak * mix(0.80, 0.98, uCore);
      gl_FragColor = vec4(hot, alpha);
    }
  `;
  const makeFlame = (profile, core = false) => {
    const geometry = new THREE.LatheGeometry(
      profile.map(([radius, height]) => new THREE.Vector2(radius, height)),
      48,
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uLength: { value: core ? 0.72 : 1.03 },
        uCore: { value: core ? 1 : 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = core ? 3 : 2;
    group.add(mesh);
    return mesh;
  };
  const outer = makeFlame([
    [0, -1.03],
    [0.029, -0.934],
    [0.07, -0.767],
    [0.123, -0.563],
    [0.164, -0.347],
    [0.195, -0.144],
    [0.186, 0],
  ]);
  const core = makeFlame(
    [
      [0, -0.72],
      [0.025, -0.59],
      [0.055, -0.401],
      [0.09, -0.189],
      [0.105, 0],
    ],
    true,
  );

  // A low-opacity warm envelope softens the edge without washing out the flame.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          vView = -p.xyz;
          gl_Position = projectionMatrix * p;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
          float alpha = pow(facing, 3.0) * (0.085 + sin(uTime * 13.0) * 0.012);
          gl_FragColor = vec4(1.0, 0.43, 0.08, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    }),
  );
  glow.position.y = -0.41;
  glow.scale.set(0.29, 0.52, 0.29);
  glow.renderOrder = 1;
  group.add(glow);
  const light = new THREE.PointLight(0xffa44b, 1.5, 1.6, 2);
  light.position.y = -0.16;
  group.add(light);

  function update(time) {
    uniforms.uTime.value = time;
    const flicker =
      Math.sin(time * 17.0) * 0.045 + Math.sin(time * 29.0 + 1.7) * 0.025;
    outer.scale.y = 0.94 + flicker;
    core.scale.y = 0.94 + Math.sin(time * 21.0) * 0.05;
    light.intensity =
      1.5 + Math.sin(time * 17.0) * 0.28 + Math.sin(time * 29.0) * 0.12;
  }
  update(0);
  return { group, update };
}
