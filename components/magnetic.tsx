"use client";

import { type ReactNode, useRef } from "react";

export default function Magnetic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={`magnetic ${className}`}
      onPointerMove={(event) => {
        const element = ref.current;
        if (
          !element ||
          event.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          element.closest('[data-motion="off"]')
        )
          return;
        const bounds = element.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
        element.style.setProperty("--magnetic-x", `${x}px`);
        element.style.setProperty("--magnetic-y", `${y}px`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--magnetic-x", "0px");
        ref.current?.style.setProperty("--magnetic-y", "0px");
      }}
    >
      {children}
    </span>
  );
}
