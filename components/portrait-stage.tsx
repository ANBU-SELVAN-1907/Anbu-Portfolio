"use client";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
export default function PortraitStage({
  src,
  name,
  location,
  stamp = "AI\n×\nIoT",
}: {
  src: string;
  name: string;
  location: string;
  stamp: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="portrait-stage"
      ref={ref}
      onPointerMove={(e) => {
        if (
          e.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          ref.current?.closest('[data-motion="off"]')
        )
          return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--rx",
          `${((e.clientY - r.top - r.height / 2) / r.height) * -7}deg`,
        );
        e.currentTarget.style.setProperty(
          "--ry",
          `${((e.clientX - r.left - r.width / 2) / r.width) * 8}deg`,
        );
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty("--rx", "0deg");
        e.currentTarget.style.setProperty("--ry", "0deg");
      }}
    >
      <div className="portrait-orbit orbit-one" aria-hidden />
      <div className="portrait-orbit orbit-two" aria-hidden />
      <div className="portrait-print">
        <div className="portrait-top">
          <span>PERSON / 001</span>
          <ArrowUpRight size={16} />
        </div>
        {src ? (
          <img
            src={src}
            alt={`${name}, in a suit outdoors`}
            width={1086}
            height={1448}
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="portrait-empty">{name}</div>
        )}
        <div className="portrait-caption">
          <span>{name}</span>
          <span>{location}</span>
        </div>
      </div>
      <div className="portrait-stamp" aria-hidden>
        {stamp.split("\n").map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
      <div className="portrait-crosshair" aria-hidden>
        +
      </div>
    </div>
  );
}
