"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { originalHeroFrames, storyPosition } from "@/lib/hero-story";

export default function ScrollStory({
  settings,
  name,
  onActiveChange,
}: {
  settings: Record<string, string>;
  name: string;
  onActiveChange: (active: boolean) => void;
}) {
  const host = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const copy = useRef<HTMLHeadingElement>(null),
    note = useRef<HTMLParagraphElement>(null);
  const status = useRef<HTMLSpanElement>(null),
    meter = useRef<HTMLSpanElement>(null);
  const frames = useMemo(() => {
    const list = settings.introFrames
      ?.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    return list && list.length >= 2 ? list : originalHeroFrames;
  }, [settings.introFrames]);
  useEffect(() => {
    const element = host.current,
      surface = canvas.current;
    if (!element || !surface) return;
    const ctx = surface.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const images: HTMLImageElement[] = [];
    let active = true,
      raf = 0,
      target = 0,
      progress = 0,
      lastTime = 0,
      loaded = 0;
    let width = 0,
      height = 0,
      announced = true;
    const disabled = () => reduced.matches || settings.motion !== "on";
    const resize = () => {
      width = element.clientWidth;
      height = innerHeight;
      const ratio = devicePixelRatio || 1;
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      updateTarget();
      start();
    };
    const updateTarget = () => {
      const rect = element.getBoundingClientRect();
      target = disabled()
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              -rect.top / Math.max(1, element.offsetHeight - innerHeight),
            ),
          );
      element.dataset.reduced = String(disabled());
      const nextActive =
        rect.bottom > innerHeight + 2 && rect.top < innerHeight;
      if (nextActive !== announced) {
        announced = nextActive;
        onActiveChange(nextActive);
      }
    };
    const renderImage = (img: HTMLImageElement, opacity: number) => {
      if (!img?.complete || !img.naturalWidth) return;
      const scale = Math.min(
        width / img.naturalWidth,
        height / img.naturalHeight,
      );
      const w = img.naturalWidth * scale,
        h = img.naturalHeight * scale;
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    };
    const draw = (now: number) => {
      raf = 0;
      if (!active || document.hidden) return;
      const dt = Math.min((now - lastTime) / 1000 || 0.016, 0.05);
      lastTime = now;
      progress = disabled()
        ? 1
        : progress + (target - progress) * (1 - Math.exp(-12 * dt));
      if (Math.abs(target - progress) < 0.0001) progress = target;
      const state = storyPosition(progress, frames.length);
      let current = state.index;
      while (current > 0 && !images[current]?.naturalWidth) current--;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#11130f";
      ctx.fillRect(0, 0, width, height);
      renderImage(images[current], 1);
      if (current === state.index) renderImage(images[state.next], state.blend);
      if (
        state.black &&
        current === state.index &&
        images[state.next]?.naturalWidth
      ) {
        ctx.globalAlpha = state.black;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1;
      const final = progress >= 0.84;
      const greeting = progress >= 0.1 && progress < 0.36;
      const middle = progress >= 0.48 && progress < 0.79;
      const text = final
        ? settings.introFinal || `This is ${name}.`
        : greeting
          ? settings.introGreeting || "Hi, welcome."
          : middle
            ? settings.introMiddle || "Curiosity. Turned into something real."
            : "";
      const begin = final ? 0.84 : greeting ? 0.1 : 0.48;
      const duration = final ? 0.1 : greeting ? 0.1 : 0.17;
      const characters = disabled()
        ? text.length
        : Math.floor(
            Math.min(1, Math.max(0, (progress - begin) / duration)) *
              text.length,
          );
      if (copy.current) {
        const plane = copy.current.parentElement;
        if (plane)
          plane.style.transform =
            disabled() || width < 700
              ? "none"
              : `perspective(900px) rotateY(${4 + (target - progress) * 14}deg) rotateX(${(target - progress) * -8}deg) translate3d(0,${(1 - progress) * 12}px,0)`;
        copy.current.textContent = text.slice(0, characters);
        copy.current.setAttribute("aria-label", text);
      }
      if (note.current)
        note.current.textContent = final
          ? "A face. A story. A world of ideas."
          : middle
            ? "Keep following the story."
            : greeting
              ? "Glad you’re here."
              : "";
      if (meter.current) meter.current.style.transform = `scaleX(${progress})`;
      element.dataset.final = String(final);
      if (progress !== target) start();
    };
    function start() {
      if (!raf && active && !document.hidden) raf = requestAnimationFrame(draw);
    }
    const scroll = () => {
      updateTarget();
      start();
    };
    const visible = () => {
      lastTime = performance.now();
      scroll();
    };
    let cursor = 0;
    const order = disabled() ? [frames.length - 1] : frames.map((_, i) => i);
    async function preload() {
      while (active && cursor < order.length) {
        const index = order[cursor++];
        const img = new window.Image();
        images[index] = img;
        img.decoding = "async";
        img.src = frames[index];
        try {
          await img.decode();
          if (!active) return;
          loaded++;
          element!.dataset.loaded = "true";
          if (status.current)
            status.current.textContent =
              loaded === order.length
                ? "SCROLL TO EXPLORE"
                : `LOADING ORIGINALS ${loaded}/${frames.length}`;
          start();
        } catch {
          if (status.current && active)
            status.current.textContent =
              "A frame could not load · continue below";
        }
      }
    }
    resize();
    preload();
    preload();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visible);
    reduced.addEventListener("change", resize);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visible);
      reduced.removeEventListener("change", resize);
    };
  }, [
    frames,
    settings.motion,
    settings.introGreeting,
    settings.introMiddle,
    settings.introFinal,
    name,
    onActiveChange,
  ]);
  return (
    <section
      className="scroll-story"
      ref={host}
      aria-label="Anbu’s introduction, from eye to final gesture"
    >
      <div className="scroll-story-stage">
        <Image
          className="story-fallback"
          unoptimized
          src={frames[0]}
          alt="Anbu, an introduction in original photographs"
          fill
          preload
          sizes="100vw"
        />
        <noscript>
          <style>{`.scroll-story{height:100svh!important}.portfolio[data-intro-active="true"] .floating-tools,.portfolio[data-intro-active="true"] .privacy-banner{visibility:visible;opacity:1;pointer-events:auto}`}</style>
        </noscript>
        <canvas ref={canvas} aria-hidden />
        <div className="story-shade" aria-hidden />
        <div className="story-copy">
          <p className="mono">A LITTLE INTRODUCTION</p>
          <h1 ref={copy}>
            <span className="sr-only">{name}</span>
          </h1>
          <p ref={note} />
        </div>
        <div className="story-bottom">
          <span className="mono" ref={status}>
            LOADING ORIGINAL FRAMES
          </span>
          <ArrowDown size={18} />
          <a href="#home" onClick={() => onActiveChange(false)}>
            Continue to portfolio <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="story-meter" aria-hidden>
          <span ref={meter} />
        </div>
      </div>
    </section>
  );
}
