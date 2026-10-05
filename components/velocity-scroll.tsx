"use client";
import { type ReactNode, useEffect, useRef } from "react";
export default function VelocityScroll({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null),
    track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      root.current?.closest('[data-motion="off"]')
    )
      return;
    let frame = 0,
      last = 0,
      y = scrollY,
      velocity = 0,
      x = 0,
      visible = true;
    const io = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !frame && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(tick);
      } else if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    if (root.current) io.observe(root.current);
    function tick(time: number) {
      frame = 0;
      if (document.hidden || !visible) return;
      const dt = Math.min((time - (last || time)) / 1000, 0.05);
      last = time;
      const current = scrollY;
      velocity +=
        (Math.min(700, Math.abs(current - y) / Math.max(dt, 0.016)) -
          velocity) *
        0.08;
      y = current;
      const width = (track.current?.scrollWidth || 0) / 2;
      if (width > 0) {
        x = (x + (22 + velocity * 0.1) * dt) % width;
        track.current?.style.setProperty(
          "transform",
          `translate3d(${-x}px,0,0)`,
        );
      }
      frame = requestAnimationFrame(tick);
    }
    const resume = () => {
      if (!document.hidden && visible && !frame) {
        last = 0;
        y = scrollY;
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", resume);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return (
    <div className="velocity-scroll" ref={root}>
      <div className="velocity-track" ref={track}>
        <div>{children}</div>
        <div aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
