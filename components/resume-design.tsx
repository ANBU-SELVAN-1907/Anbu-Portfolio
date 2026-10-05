"use client";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { resumeBlocks, type ResumeDocument } from "@/lib/resume/model";

const templates = [
  {
    id: "classic",
    name: "Classic",
    detail: "Compact, left aligned, monochrome",
    spacing: 1.3,
    gap: 12,
    nameSize: 24,
  },
  {
    id: "technical",
    name: "Technical",
    detail: "Clear navy headings, balanced spacing",
    spacing: 1.35,
    gap: 14,
    nameSize: 25,
  },
  {
    id: "executive",
    name: "Executive",
    detail: "Centered introduction, generous spacing",
    spacing: 1.4,
    gap: 16,
    nameSize: 27,
  },
] as const;

export default function ResumeDesign({
  resume: r,
  onChange,
}: {
  resume: ResumeDocument;
  onChange: (r: ResumeDocument) => void;
}) {
  const p = r.presentation;
  const blocks = resumeBlocks(r);
  const set = (patch: Partial<typeof p>) =>
    onChange({ ...r, presentation: { ...p, ...patch } });
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    change: (v: number) => void,
    unit = "pt",
  ) => (
    <label className="resume-field">
      {label}{" "}
      <span className="resume-control-value">
        {value}
        {unit}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => change(Number(e.target.value))}
      />
    </label>
  );
  return (
    <>
      <p className="resume-helper">
        Choose a starting layout, then adjust it to your content. All three
        export selectable text in a single column.
      </p>
      <div className="resume-template-grid">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={r.template === t.id}
            onClick={() =>
              onChange({
                ...r,
                template: t.id,
                presentation: {
                  ...p,
                  lineSpacing: t.spacing,
                  sectionSpacing: t.gap,
                  nameSize: t.nameSize,
                  accent: t.id === "technical" ? "navy" : "black",
                },
              })
            }
          >
            <span
              className={`resume-template-sheet ${t.id}`}
              aria-hidden="true"
            >
              <i className="sample-name" />
              <i className="sample-contact" />
              {[0, 1, 2].map((n) => (
                <span className="sample-section" key={n}>
                  <i className="sample-heading" />
                  <i />
                  <i />
                  <i className="sample-short" />
                </span>
              ))}
            </span>
            <strong>
              {t.name}
              {r.template === t.id && <Check size={16} aria-label="Selected" />}
            </strong>
            <span>{t.detail}</span>
          </button>
        ))}
      </div>
      <h2 className="resume-subheading">Typography and page</h2>
      <div className="resume-design-controls">
        <label className="resume-field">
          Paper size
          <select
            value={r.pageSize}
            onChange={(e) =>
              onChange({ ...r, pageSize: e.target.value as "A4" | "Letter" })
            }
          >
            <option>A4</option>
            <option>Letter</option>
          </select>
        </label>
        <label className="resume-field">
          Heading color
          <select
            value={p.accent}
            onChange={(e) => set({ accent: e.target.value as typeof p.accent })}
          >
            <option value="black">Black</option>
            <option value="navy">Navy</option>
            <option value="slate">Slate</option>
          </select>
        </label>
        {range("Body text", r.fontSize, 10, 12, 0.5, (v) =>
          onChange({ ...r, fontSize: v }),
        )}
        {range("Name size", p.nameSize, 20, 30, 1, (v) => set({ nameSize: v }))}
        {range("Page margins", r.margin, 36, 64, 1, (v) =>
          onChange({ ...r, margin: v }),
        )}
        {range(
          "Line spacing",
          p.lineSpacing,
          1.15,
          1.6,
          0.05,
          (v) => set({ lineSpacing: v }),
          "×",
        )}
        {range("Section spacing", p.sectionSpacing, 8, 22, 1, (v) =>
          set({ sectionSpacing: v }),
        )}
        {range("Bullet indentation", p.bulletIndent, 8, 24, 1, (v) =>
          set({ bulletIndent: v }),
        )}
      </div>
      <h2 className="resume-subheading">Section order and visibility</h2>
      <p className="resume-helper">
        Move any section, including Summary and Skills. Hidden content stays in
        your draft and is excluded from exports.
      </p>
      <ol className="resume-order-list">
        {blocks.map((b, i) => (
          <li key={b.id}>
            <label>
              <input
                type="checkbox"
                checked={b.visible}
                onChange={(e) => {
                  if (b.id === "summary")
                    set({ summaryVisible: e.target.checked });
                  else if (b.id === "skills")
                    set({ skillsVisible: e.target.checked });
                  else
                    onChange({
                      ...r,
                      sections: r.sections.map((s) =>
                        s.id === b.id ? { ...s, visible: e.target.checked } : s,
                      ),
                    });
                }}
              />
              {b.heading}
            </label>
            <div>
              {([-1, 1] as const).map((d) => (
                <button
                  type="button"
                  className="resume-icon"
                  key={d}
                  disabled={i + d < 0 || i + d >= blocks.length}
                  aria-label={`Move ${b.heading} ${d < 0 ? "up" : "down"}`}
                  onClick={() => {
                    const ids = blocks.map((x) => x.id);
                    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
                    onChange({ ...r, sectionOrder: ids });
                  }}
                >
                  {d < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
