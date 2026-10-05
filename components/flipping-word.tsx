"use client";

import { useEffect, useState, useRef } from "react";

export default function FlippingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (
      words.length < 2 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      ref.current?.closest('[data-motion="off"]')
    )
      return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % words.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [words.length]);
  return (
    <span ref={ref} className="flipping-word" aria-label={words.join(", ")}>
      <span aria-hidden key={words[index]}>
        {words[index] || words[0]}
      </span>
    </span>
  );
}
