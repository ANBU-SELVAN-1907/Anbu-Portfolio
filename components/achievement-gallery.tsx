"use client";
import { useState } from "react";
import { Award, ArrowUpRight, ImageIcon } from "lucide-react";
import type { Entry } from "@/lib/content";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
export default function AchievementGallery({ entries }: { entries: Entry[] }) {
  const [filter, setFilter] = useState("All"),
    [limit, setLimit] = useState(9),
    [selected, setSelected] = useState<Entry | null>(null);
  const tags = [
    "All",
    ...Array.from(
      new Set(
        entries.flatMap((x) =>
          x.tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ),
      ),
    ),
  ].slice(0, 12);
  const items = entries.filter(
    (x) =>
      filter === "All" ||
      x.tags
        .split(",")
        .map((x) => x.trim())
        .includes(filter),
  );
  return (
    <>
      <div className="gallery-filters" aria-label="Filter achievements">
        {tags.map((t) => (
          <button
            key={t}
            aria-pressed={t === filter}
            onClick={() => {
              setFilter(t);
              setLimit(9);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="achievement-grid">
        {items.slice(0, limit).map((x, i) => (
          <button
            className="achievement-card"
            key={x.id}
            onClick={() => setSelected(x)}
          >
            <div className="achievement-visual">
              {x.image ? (
                <img
                  src={x.image}
                  alt={x.title}
                  loading="lazy"
                  width={600}
                  height={450}
                />
              ) : (
                <>
                  <Award size={64} strokeWidth={0.8} />
                  <span className="mono">
                    {String(i + 1).padStart(2, "0")} / {x.subtitle}
                  </span>
                </>
              )}
              <span className="achievement-open">
                <ImageIcon size={17} /> Explore
              </span>
            </div>
            <div className="achievement-caption">
              <p className="mono">{x.period}</p>
              <h3>{x.title}</h3>
              <p>{x.description}</p>
              <ArrowUpRight size={20} />
            </div>
          </button>
        ))}
      </div>
      {items.length > limit && (
        <button className="button" onClick={() => setLimit((v) => v + 9)}>
          Show more achievements ({items.length - limit})
        </button>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="folio-dialog gallery-dialog">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>
            {selected?.subtitle} · {selected?.period}
          </DialogDescription>
          {selected?.image && (
            <img
              src={selected.image}
              alt={selected.title}
              width={1000}
              height={750}
            />
          )}
          <p>{selected?.description}</p>
          {selected?.link && (
            <a
              className="button"
              href={selected.link}
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowUpRight size={16} />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
