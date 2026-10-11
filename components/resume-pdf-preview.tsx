"use client";
import { useEffect, useRef, useState } from "react";
export default function ResumePdfPreview({
  url,
  bytes,
  label = "Resume PDF",
}: {
  url?: string;
  bytes?: Uint8Array;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState("Rendering exact PDF pages…");
  useEffect(() => {
    let cancelled = false,
      loading: { destroy: () => Promise<void> } | undefined;
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({
          data: bytes
            ? bytes.slice()
            : new Uint8Array(await (await fetch(url!)).arrayBuffer()),
        });
        loading = task;
        const doc = await task.promise;
        if (cancelled) return;
        root.current?.replaceChildren();
        for (let index = 1; index <= Math.min(doc.numPages, 20); index++) {
          if (cancelled) break;
          const page = await doc.getPage(index),
            canvas = document.createElement("canvas"),
            viewport = page.getViewport({ scale: 1.4 }),
            context = canvas.getContext("2d");
          if (!context) throw Error("Canvas preview unavailable.");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute("aria-label", `${label} page ${index}`);
          canvas.setAttribute("role", "img");
          root.current?.appendChild(canvas);
          await page.render({ canvas, canvasContext: context, viewport })
            .promise;
        }
        if (!cancelled)
          setStatus(
            `${doc.numPages} PDF page(s). ${label === "Resume PDF" ? "Use Text & parser for the accessible text version." : "Open the original document for its text and details."}`,
          );
      } catch {
        if (!cancelled)
          setStatus(
            "PDF preview could not render. The verified download and text view remain available.",
          );
      }
    }
    render();
    return () => {
      cancelled = true;
      loading?.destroy().catch(() => {});
    };
  }, [url, bytes, label]);
  return (
    <div className="resume-pdf-preview">
      <p role="status">{status}</p>
      <div className="resume-pdf-pages" ref={root} />
    </div>
  );
}
