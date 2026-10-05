"use client";
import { type ReactNode, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
export default function CollectionSurfer({
  children,
}: {
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior:
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        el.closest('[data-motion="off"]')
          ? "instant"
          : "smooth",
    });
  };
  return (
    <div className="collection">
      <div className="collection-controls">
        <span>THE PROJECT INDEX / SWIPE TO BROWSE</span>
        <div>
          <button aria-label="Previous projects" onClick={() => move(-1)}>
            <ArrowLeft size={17} />
          </button>
          <button aria-label="Next projects" onClick={() => move(1)}>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <div
        className="collection-rail"
        ref={rail}
        tabIndex={0}
        aria-label="Project collection"
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
