// Generates the legacy Olentra AI Studio "Spark O, film swirl" logo: an Olentra-colour
// swirl ring with film sprocket holes, a warm play mark, closed by the Olentra star.
// Usage: node scripts/generate-ai-studio-logo.mjs  → writes the SVG and a 1254px transparent PNG.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// The approved metallic logo is a generated image; do not overwrite it here.
const OUT = "apps/web/public/images/products/branding/olentra-ai-studio-film-legacy";
const STOPS = [[-24, [255, 226, 90]], [30, [255, 166, 77]], [95, [255, 99, 110]], [138, [240, 110, 180]], [175, [77, 150, 255]], [220, [110, 220, 255]], [262, [110, 225, 150]], [294, [175, 230, 110]]];
const color = angle => {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a0, c0] = STOPS[i], [a1, c1] = STOPS[i + 1];
    if (angle <= a1) { const t = Math.min(1, Math.max(0, (angle - a0) / (a1 - a0))); return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * t)).join(",")})`; }
  }
  return `rgb(${STOPS.at(-1)[1].join(",")})`;
};
const f = n => +n.toFixed(2);
const point = (cx, cy, r, a) => { const q = (a * Math.PI) / 180; return `${f(cx + r * Math.cos(q))} ${f(cy + r * Math.sin(q))}`; };
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const star = (x, y, r, k = r * 0.16) => `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`;

// Ring: outer circle minus an inner circle pushed toward the gap, so it tapers into the star.
const cx = 80, cy = 86, R = 50, r = 33, d = 13, gap = -45;
const icx = f(cx + d * Math.cos((gap * Math.PI) / 180)), icy = f(cy + d * Math.sin((gap * Math.PI) / 180));
let wedges = "";
for (let a = -24; a < 294; a += 1) wedges += `<path d="M${cx} ${cy}L${point(cx, cy, R + 4, a)}L${point(cx, cy, R + 4, Math.min(a + 1.6, 294))}Z" fill="${color(a + 0.5)}"/>`;
const holes = [120, 140, 160, 180, 200, 220].map(a => {
  const q = (a * Math.PI) / 180, x = cx + 38 * Math.cos(q), y = cy + 38 * Math.sin(q);
  return `<rect x="${f(x - 2.5)}" y="${f(y - 3)}" width="5" height="6" rx="1.4" fill="#000" transform="rotate(${a + 90} ${f(x)} ${f(y)})"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="21 11 132 132" width="1254" height="1254">
<defs>
<clipPath id="ring"><path clip-rule="evenodd" d="${circle(cx, cy, R)}${circle(icx, icy, r)}"/></clipPath>
<mask id="sprockets" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect x="0" y="0" width="200" height="200" fill="#fff"/>${holes}</mask>
<radialGradient id="star" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbd1"/><stop offset=".35" stop-color="#ffe878"/><stop offset="1" stop-color="#ffb640"/></radialGradient>
<linearGradient id="play" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf5a"/><stop offset="1" stop-color="#ff6b6b"/></linearGradient>
</defs>
<g mask="url(#sprockets)"><g clip-path="url(#ring)">${wedges}</g></g>
<polygon points="74,67 74,97 100,82" fill="url(#play)" stroke="url(#play)" stroke-width="6" stroke-linejoin="round"/>
<path d="${star(122, 40, 22)}" fill="url(#star)"/>
</svg>
`;
await writeFile(OUT + ".svg", svg);
await sharp(Buffer.from(svg)).png().toFile(OUT + ".png");
console.log("Wrote", OUT + ".svg", "and", OUT + ".png");
