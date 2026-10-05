"use client";
import { useEffect, useRef } from "react";
export default function LiveBackground({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !enabled) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      visible = true,
      last = 0;
    const points = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      dx: (Math.random() - 0.5) * 0.00015,
      dy: (Math.random() - 0.5) * 0.0001,
    }));
    function resize() {
      const r = canvas!.getBoundingClientRect();
      width = r.width;
      height = r.height;
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now: number) {
      if (!visible || document.hidden || reduced.matches) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(draw);
      if (now - last < 33) return;
      const dt = Math.min((now - last) / 33, 2);
      last = now;
      ctx!.clearRect(0, 0, width, height);
      const n = width < 600 ? 24 : points.length;
      for (let i = 0; i < n; i++) {
        const a = points[i];
        a.x = (a.x + a.dx * dt + 1) % 1;
        a.y = (a.y + a.dy * dt + 1) % 1;
        ctx!.fillStyle = "rgba(112,124,122,.24)";
        ctx!.fillRect(a.x * width, a.y * height, 2, 2);
        for (let j = i + 1; j < n; j++) {
          const b = points[j],
            distance = Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
          if (distance < 150) {
            ctx!.strokeStyle = `rgba(112,124,122,${0.1 * (1 - distance / 150)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x * width, a.y * height);
            ctx!.lineTo(b.x * width, b.y * height);
            ctx!.stroke();
          }
        }
      }
    }
    function start() {
      if (!frame && visible && !document.hidden && !reduced.matches) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      start();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    resize();
    start();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", start);
      reduced.removeEventListener("change", start);
    };
  }, [enabled]);
  return <canvas className="live-network" ref={ref} aria-hidden />;
}
