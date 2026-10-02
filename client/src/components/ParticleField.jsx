// 3D particle field for the landing hero.
// Hand-rolled perspective projection on a 2D canvas — no three.js, no new dependencies.
// Particles live in a rotating volume; depth drives size, alpha and blur so the field
// reads as real space rather than a flat dot pattern. Pointer nudges the camera.
import { useEffect, useRef } from "react";

const FOV = 420;          // focal length — smaller = more dramatic perspective
const DEPTH = 900;        // volume depth on the z axis
const SPREAD = 1100;      // volume width/height
const LINK_DIST = 118;    // px, screen-space distance for constellation links

export default function ParticleField({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // Honour the OS motion preference — no animation loop at all if reduced.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let running = true;

    // camera state — target values are eased toward for a springy feel
    const cam = { rx: 0, ry: 0, tx: 0, ty: 0, spin: 0 };

    function build() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // scale the count to the viewport so phones stay at 60fps
      const count = width < 640 ? 55 : width < 1100 ? 90 : 130;
      particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(initial) {
      return {
        x: (Math.random() - 0.5) * SPREAD,
        y: initial ? (Math.random() - 0.5) * SPREAD * 0.75 : SPREAD * 0.42,
        z: Math.random() * DEPTH - DEPTH / 2,
        // embers drift upward at varying speed; the biggest ones move slowest (parallax)
        vy: -(0.18 + Math.random() * 0.55),
        vx: (Math.random() - 0.5) * 0.16,
        r: 0.8 + Math.random() * 2.4,
        // 0 = deep ember, 1 = bright spark
        heat: Math.random(),
        tw: Math.random() * Math.PI * 2,   // twinkle phase
      };
    }

    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();
      cam.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      cam.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    function onLeave() {
      cam.tx = 0;
      cam.ty = 0;
    }

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);

      // ease camera toward pointer target + constant slow orbit
      cam.rx += (cam.tx * 0.24 - cam.rx) * 0.045;
      cam.ry += (cam.ty * 0.16 - cam.ry) * 0.045;
      cam.spin += 0.0011;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const sinA = Math.sin(cam.spin + cam.rx);
      const cosA = Math.cos(cam.spin + cam.rx);
      const tilt = cam.ry * 140;

      const projected = [];

      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx;
        p.tw += 0.03;

        // recycle embers that drift out of the top of the volume
        if (p.y < -SPREAD * 0.5) Object.assign(p, spawn(false));

        // rotate around the Y axis, then project
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        const denom = FOV + rz + DEPTH / 2;
        if (denom <= 1) continue;

        const scale = FOV / denom;
        const sx = cx + rx * scale;
        const sy = cy + (p.y + tilt) * scale;
        if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;

        const depth = 1 - (rz + DEPTH / 2) / DEPTH; // 1 = near, 0 = far
        const twinkle = 0.72 + Math.sin(p.tw) * 0.28;
        const alpha = Math.max(0, Math.min(1, depth * 0.85 + 0.1)) * twinkle;
        const radius = Math.max(0.4, p.r * scale);

        projected.push({ sx, sy, radius, alpha, heat: p.heat, depth });
      }

      // constellation links — near pairs only, drawn under the embers
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        if (a.depth < 0.45) continue; // only the front layer links up
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          if (b.depth < 0.45) continue;
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;
          const t = 1 - Math.sqrt(d2) / LINK_DIST;
          ctx.strokeStyle = `rgba(10, 102, 194, ${(t * 0.16 * a.alpha * b.alpha).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }

      // particles, normal blending so they read on the light canvas
      ctx.globalCompositeOperation = "source-over";
      for (const p of projected) {
        // bright ones skew light blue, cool ones deep LinkedIn blue
        const r = Math.round(10 + p.heat * 102);
        const g = Math.round(102 + p.heat * 79);
        const b = Math.round(194 + p.heat * 55);
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, p.radius * 4.5);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.55})`);
        glow.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.42})`);
        glow.addColorStop(1, "rgba(10, 102, 194, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius * 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, p.alpha * 1.15)})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    build();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
