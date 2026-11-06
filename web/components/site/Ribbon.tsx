"use client";

// The twisting blue-and-manila band behind the cover. It drifts slowly; it stays still for
// visitors who turn on reduced motion and pauses while the tab is hidden.

import { useEffect, useState } from "react";

// The middle of the band passes through these points: up past the headline, over the year
// clock and down the right side.
const PATH = [[470, 1080], [540, 770], [590, 480], [650, 240], [800, 140], [960, 128], [1110, 190], [1185, 330], [1230, 600], [1300, 1000]];
const TWISTS = 1.3;
const SAMPLES = 140;
// Blue pencil on the front face, manila on the back.
const FRONT = [[44, 91, 160], [104, 146, 212], [176, 200, 236]];
const BACK = [[190, 156, 92], [220, 198, 146], [236, 224, 192]];

type Point = [number, number];

function mix(a: number[], b: number[], k: number) {
  return a.map((v, i) => v + (b[i] - v) * k);
}

function shade(stops: number[][], k: number) {
  return k < 0.5 ? mix(stops[0], stops[1], k * 2) : mix(stops[1], stops[2], (k - 0.5) * 2);
}

function xy(p: Point) {
  return p[0].toFixed(1) + " " + p[1].toFixed(1);
}

function band(time: number) {
  const points: Point[] = PATH.map(([x, y], i) => [x + Math.sin(time * 0.4 + i) * 6, y + Math.cos(time * 0.35 + i * 1.3) * 6]);
  const phase = 1.15 + Math.sin(time * 0.3) * 0.06;

  // Catmull-Rom spline through the points.
  const along = (t: number): Point => {
    const n = points.length - 1;
    const f = Math.min(n - 1e-6, t * n);
    const i = Math.floor(f);
    const k = f - i;
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n, i + 2)];
    const curve = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (c - a) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (3 * b - a - 3 * c + d) * k * k * k);
    return [curve(p0[0], p1[0], p2[0], p3[0]), curve(p0[1], p1[1], p2[1], p3[1])];
  };

  // A point on the band: t runs along it, u runs across it from -0.5 to 0.5.
  const at = (t: number, u: number): Point => {
    const [x, y] = along(t);
    const [xa, ya] = along(Math.max(0, t - 0.002));
    const [xb, yb] = along(Math.min(1, t + 0.002));
    const length = Math.hypot(xb - xa, yb - ya) || 1;
    const nx = -(yb - ya) / length;
    const ny = (xb - xa) / length;
    const width = 80 + 120 * Math.sin(Math.PI * t);
    const angle = Math.PI * (t * TWISTS + phase);
    const across = width * Math.cos(angle) * u;
    const depth = Math.sin(angle) * 22 * u;
    return [x + nx * across + depth * 0.5, y + ny * across - depth];
  };

  const faces = [];
  for (let j = 0; j < SAMPLES; j++) {
    const t0 = j / SAMPLES;
    const t1 = (j + 1) / SAMPLES;
    const mid = (t0 + t1) / 2;
    const facing = Math.cos(Math.PI * (mid * TWISTS + phase));
    const color = shade(facing >= 0 ? FRONT : BACK, Math.abs(Math.sin(Math.PI * mid * 1.2)));
    const light = 0.8 + 0.28 * Math.abs(facing);
    faces.push({
      points: [at(t0, -0.5), at(t0, 0.5), at(t1, 0.5), at(t1, -0.5)].map(xy).join(" "),
      fill: "rgb(" + color.map((v) => Math.round(Math.min(255, v * light))).join(",") + ")",
    });
  }

  const strand = (u: number) => {
    let d = "";
    for (let j = 0; j <= SAMPLES; j += 2) d += (j ? "L" : "M") + xy(at(j / SAMPLES, u));
    return d;
  };
  const lines = [];
  for (let k = 0; k < 34; k++) {
    const u = k / 33 - 0.5;
    lines.push({ d: strand(u), opacity: 0.1 + 0.5 * Math.abs(u) });
  }
  const glints = [-0.3, -0.05, 0.2, 0.42].map((u, i) => ({ d: strand(u), delay: `${-i * 1.8}s` }));
  return { faces, lines, glints };
}

export default function Ribbon() {
  const [time, setTime] = useState(0);

  // About 24 redraws a second is plenty for something this calm.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (now - last > 42 && !document.hidden) {
        last = now;
        setTime((now - started) / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const { faces, lines, glints } = band(time);

  return (
    <div aria-hidden="true" className="ribbon-in" style={{ position: "relative", width: 1400, height: 1000, pointerEvents: "none" }}>
      <svg width="1400" height="1000" viewBox="0 0 1400 1000"
        style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 30px 40px rgba(38,41,44,.14))" }}>
        <g opacity=".95">
          {faces.map((f, i) => <polygon key={i} points={f.points} fill={f.fill} stroke={f.fill} strokeWidth=".8" />)}
          {lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke="#ffffff" strokeOpacity={l.opacity} strokeWidth=".8" />)}
          {glints.map((g, i) => (
            <path key={i} className="glint" d={g.d} pathLength={1} fill="none" stroke="#ffffff" strokeOpacity=".8"
              strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: g.delay }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
