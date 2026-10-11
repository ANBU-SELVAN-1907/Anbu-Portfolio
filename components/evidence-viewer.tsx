"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ArrowUpRight, Download, LoaderCircle } from "lucide-react";
import type { Entry } from "@/lib/content";
import ResumePdfPreview from "./resume-pdf-preview";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export default function EvidenceViewer({
  entry,
  onClose,
}: {
  entry: Entry | null;
  onClose: () => void;
}) {
  const [document, setDocument] = useState<{
    url: string;
    type: string;
    bytes?: Uint8Array;
    error?: string;
  } | null>(null);
  const url = entry?.media || entry?.image || "";
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    if (!url.startsWith("/api/media/") && !/\.pdf(?:\?|$)/i.test(url)) return;
    fetch(url.startsWith("/api/media/") ? `${url}?info=1` : url, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error("This proof could not load. Please try again.");
        const type = url.startsWith("/api/media/")
          ? String((await r.json()).type)
          : r.headers.get("content-type") || "";
        if (type.includes("pdf")) {
          const pdf = url.startsWith("/api/media/")
            ? await fetch(url, { signal: controller.signal })
            : r;
          if (!pdf.ok) throw Error("The original document could not load.");
          const bytes = new Uint8Array(await pdf.arrayBuffer());
          if (!controller.signal.aborted) setDocument({ url, type, bytes });
        } else if (!controller.signal.aborted) setDocument({ url, type });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setDocument({ url, type: "", error: e.message });
      });
    return () => controller.abort();
  }, [url]);
  const loading =
    url &&
    (url.startsWith("/api/media/") || /\.pdf(?:\?|$)/i.test(url)) &&
    document?.url !== url;
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="folio-dialog evidence-dialog">
        <DialogTitle>{entry?.title}</DialogTitle>
        <DialogDescription>
          {entry?.subtitle || "Supporting proof"}
        </DialogDescription>
        <div className="evidence-layout">
          <div className="evidence-preview">
            {loading ? (
              <p role="status">
                <LoaderCircle className="spin" size={18} /> Loading original…
              </p>
            ) : document?.url === url && document.error ? (
              <p role="alert">{document.error}</p>
            ) : document?.url === url && document.bytes ? (
              <ResumePdfPreview
                bytes={document.bytes}
                label="Supporting document"
              />
            ) : document?.url === url && document.type.startsWith("video/") ? (
              <video
                controls
                playsInline
                preload="metadata"
                src={url}
                aria-label={entry?.title}
              />
            ) : document?.url === url && document.type.startsWith("audio/") ? (
              <audio
                controls
                preload="metadata"
                src={url}
                aria-label={entry?.title}
              />
            ) : document?.url === url &&
              document.type &&
              !document.type.startsWith("image/") ? (
              <p>Use Open original to download this document or data file.</p>
            ) : url ? (
              <Image
                unoptimized
                src={url}
                alt={entry?.title || "Supporting proof"}
                width={1672}
                height={1200}
              />
            ) : (
              <p>A supporting document hasn’t been uploaded yet.</p>
            )}
          </div>
          <aside className="evidence-details">
            <p>{entry?.description}</p>
            <dl>
              {[
                ["Issuer / organization", entry?.subtitle],
                ["Date", entry?.issued || entry?.period],
                ["Credential ID", entry?.credentialId],
                ["Expiry", entry?.expires],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            {url && (
              <a className="button" href={url} target="_blank" rel="noreferrer">
                <Download size={16} /> Open original
              </a>
            )}
            {entry?.link && !entry.link.includes("linkedin.com/") && (
              <a
                className="underlink"
                href={entry.link}
                target="_blank"
                rel="noreferrer"
              >
                Verify credential / reference <ArrowUpRight size={16} />
              </a>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
