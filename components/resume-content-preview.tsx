import type { CSSProperties } from "react";
import { resumeBlocks, type ResumeDocument } from "@/lib/resume/model";
export default function ResumeContentPreview({
  resume: r,
}: {
  resume: ResumeDocument;
}) {
  const p = r.presentation;
  const style = {
    "--document-font": `${r.fontSize}px`,
    "--document-name": `${p.nameSize}px`,
    "--document-leading": p.lineSpacing,
    "--document-gap": `${p.sectionSpacing}px`,
    "--document-indent": `${p.bulletIndent}px`,
    "--document-margin": `${r.margin * 0.7}px`,
    "--document-accent":
      p.accent === "navy"
        ? "#203a59"
        : p.accent === "slate"
          ? "#3e4857"
          : "#171717",
  } as CSSProperties;
  return (
    <article className={`resume-paper ${r.template}`} style={style}>
      <div className="resume-document-intro">
        <h2>{r.basics.name || "Your name"}</h2>
        {r.basics.headline && <strong>{r.basics.headline}</strong>}
        <p>
          {[r.basics.email, r.basics.phone, r.basics.location]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {r.basics.linkedin && <p>{r.basics.linkedin}</p>}
        {r.basics.website && <p>{r.basics.website}</p>}
      </div>
      {resumeBlocks(r)
        .filter((b) => b.visible && (b.text?.trim() || b.items?.length))
        .map((b) => (
          <section key={b.id}>
            <h3>{b.heading}</h3>
            {b.text !== undefined ? (
              <p>{b.text}</p>
            ) : (
              b.items?.map((i) => (
                <div key={i.id}>
                  <h4>
                    {[i.title, i.organisation, i.location]
                      .filter(Boolean)
                      .join(" | ")}
                  </h4>
                  {(i.start || i.end || i.current) && (
                    <p className="resume-document-date">
                      {[i.start, i.current ? "Present" : i.end]
                        .filter(Boolean)
                        .join(" – ")}
                    </p>
                  )}
                  {!!i.bullets.filter(Boolean).length && (
                    <ul>
                      {i.bullets.filter(Boolean).map((text, j) => (
                        <li key={j}>{text}</li>
                      ))}
                    </ul>
                  )}
                  {i.link && <p>{i.link}</p>}
                </div>
              ))
            )}
          </section>
        ))}
    </article>
  );
}
