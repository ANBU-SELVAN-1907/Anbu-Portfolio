"use client";
import { useEffect, useRef } from "react";
// A contour field echoes connected hardware: bounded drawing, no DOM particles.
export default function LiveBackground({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !enabled) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      frame = 0,
      last = 0,
      visible = true,
      time = 0,
      pointer = 0,
      target = 0,
      color = "#789071";
    const host = canvas.closest(".portfolio");
    const palette = () => {
      if (host)
        color =
          getComputedStyle(host).getPropertyValue("--orange").trim() ||
          "#789071";
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) return;
      frame = requestAnimationFrame(draw);
      if (now - last < 33) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      pointer += (target - pointer) * 0.05;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = color;
      context.fillStyle = color;
      const count = width < 600 ? 7 : 13;
      for (let line = 0; line < count; line++) {
        context.beginPath();
        context.globalAlpha = 0.065 + (line % 3) * 0.015;
        context.lineWidth = line % 4 === 0 ? 1.4 : 0.65;
        for (let step = 0; step <= 64; step++) {
          const x = (width * step) / 64,
            phase = (step / 64) * Math.PI * 3.2 + time * 0.16;
          const envelope = Math.sin((step / 64) * Math.PI);
          const y =
            height * 0.66 +
            line * 16 +
            Math.sin(phase + line * 0.055) * (height * 0.17) * envelope +
            Math.cos(phase * 0.57) * 30 +
            pointer * envelope * 18;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }
      context.globalAlpha = 1;
    };
    const start = () => {
      if (!frame && visible && !document.hidden && !reduced.matches) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      } else if (reduced.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        context.clearRect(0, 0, width, height);
      }
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse")
        target = (event.clientX / innerWidth - 0.5) * 2;
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    });
    observer.observe(canvas);
    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    const changes = new MutationObserver(palette);
    if (host)
      changes.observe(host, {
        attributes: true,
        attributeFilter: ["data-theme", "data-visual", "style"],
      });
    document.addEventListener("visibilitychange", start);
    window.addEventListener("pointermove", pointerMove, { passive: true });
    reduced.addEventListener("change", start);
    resize();
    palette();
    start();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizes.disconnect();
      changes.disconnect();
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("pointermove", pointerMove);
      reduced.removeEventListener("change", start);
    };
  }, [enabled]);
  return <canvas className="live-network" ref={ref} aria-hidden />;
}
