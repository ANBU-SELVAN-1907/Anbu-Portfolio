"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number; phase: number; size: number };

/** Lightweight, canvas-only ambient field used behind the hero. */
export default function Ambient({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let time = 0;
    let pointerX = 0;
    let pointerY = 0;
    let visible = true;
    const points: Point[] = Array.from({ length: 170 }, (_, index) => ({
      x: (index * 0.6180339887) % 1,
      y: ((index * 0.3819660113) % 1) * 1.2 - 0.1,
      z: (index % 17) / 16,
      phase: index * 1.73,
      size: 0.45 + (index % 4) * 0.28,
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const onPointer = (event: PointerEvent) => {
      pointerX +=
        ((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2 -
          pointerX) *
        0.06;
      pointerY +=
        ((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2 -
          pointerY) *
        0.06;
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    visibility.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });

    const draw = () => {
      if (visible) {
        const motion = enabled && !reduced.matches;
        time += motion ? 0.006 : 0;
        ctx.clearRect(0, 0, width, height);
        const glow = ctx.createRadialGradient(
          width * 0.71,
          height * 0.47,
          0,
          width * 0.71,
          height * 0.47,
          Math.max(width, height) * 0.66,
        );
        glow.addColorStop(0, "rgba(94, 116, 228, 0.16)");
        glow.addColorStop(0.42, "rgba(53, 74, 164, 0.07)");
        glow.addColorStop(1, "rgba(8, 11, 20, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(
          width * 0.7 + pointerX * 24,
          height * 0.52 + pointerY * 14,
        );
        ctx.rotate(-0.2 + pointerX * 0.04);
        for (let ribbon = 0; ribbon < 7; ribbon += 1) {
          const radius = Math.min(width, height) * (0.26 + ribbon * 0.045);
          ctx.beginPath();
          for (let step = 0; step <= 72; step += 1) {
            const angle = (step / 72) * Math.PI * 2;
            const wave = Math.sin(angle * 2 + time * 0.7 + ribbon) * 5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * (0.28 + ribbon * 0.015) + wave;
            step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(133, 157, 255, ${0.07 - ribbon * 0.006})`;
          ctx.lineWidth = ribbon === 2 ? 1.4 : 0.7;
          ctx.stroke();
        }
        ctx.restore();

        const projected = points.map((point) => {
          const drift = motion ? time * 0.7 + point.phase * 0.002 : 0;
          const angle = drift * 0.24 + pointerX * 0.12;
          const baseX = point.x * 2 - 1;
          const baseY = point.y * 2 - 1;
          const depth = Math.sin(point.phase + drift) * 0.5 + 0.5;
          const rotatedX = baseX * Math.cos(angle) - depth * Math.sin(angle);
          const rotatedZ = baseX * Math.sin(angle) + depth * Math.cos(angle);
          const perspective = 0.78 + rotatedZ * 0.2;
          return {
            x: width * 0.7 + rotatedX * width * 0.28 * perspective,
            y:
              height * 0.51 +
              (baseY + Math.sin(drift + point.phase) * 0.035) *
                height *
                0.31 *
                perspective +
              pointerY * 10,
            z: rotatedZ,
            size: point.size * (0.7 + perspective),
          };
        });
        projected.forEach((point, index) => {
          const alpha = 0.08 + Math.max(0, point.z) * 0.38;
          ctx.fillStyle = `rgba(184, 198, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
          ctx.fill();
          if (index % 3 === 0) {
            const neighbor = projected[(index + 13) % projected.length];
            const distance = Math.hypot(
              point.x - neighbor.x,
              point.y - neighbor.y,
            );
            if (distance < 92) {
              ctx.strokeStyle = `rgba(117, 143, 236, ${0.1 * (1 - distance / 92)})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(point.x, point.y);
              ctx.lineTo(neighbor.x, neighbor.y);
              ctx.stroke();
            }
          }
        });
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, [enabled]);

  return <canvas ref={ref} className="ambient-canvas" aria-hidden="true" />;
}
