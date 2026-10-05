import type { PDFRef, PDFArray } from "pdf-lib";
import type { ResumeDocument } from "./model";
import { resumeText, resumeBlocks } from "./model";
export type ResumeLine = {
  text: string;
  kind: "name" | "role" | "heading" | "normal" | "contact" | "bullet" | "space";
};
export function resumeLines(r: ResumeDocument): ResumeLine[] {
  const a: ResumeLine[] = [];
  const add = (text: string, kind: ResumeLine["kind"] = "normal") => {
    for (const line of text.split("\n"))
      if (line.trim())
        a.push({
          text:
            r.template === "executive" && ["name", "heading"].includes(kind)
              ? line.toUpperCase()
              : line,
          kind,
        });
  };
  add(r.basics.name, "name");
  add(r.basics.headline, "role");
  add(
    [r.basics.email, r.basics.phone, r.basics.location]
      .filter(Boolean)
      .join(" | "),
    "contact",
  );
  add(r.basics.linkedin, "contact");
  add(r.basics.website, "contact");
  for (const s of resumeBlocks(r).filter((x) => x.visible)) {
    if (s.text !== undefined) {
      if (s.text.trim()) {
        add(s.heading, "heading");
        add(s.text);
      }
      continue;
    }
    if (!s.items?.length) continue;
    add(s.heading, "heading");
    for (const i of s.items) {
      add(
        [i.title, i.organisation, i.location].filter(Boolean).join(" | "),
        "role",
      );
      add([i.start, i.current ? "Present" : i.end].filter(Boolean).join(" – "));
      for (const b of i.bullets) add(b, "bullet");
      add(i.link);
      a.push({ text: "", kind: "space" });
    }
  }
  return a;
}
let fonts: Promise<ArrayBuffer[]> | undefined;
export async function exportPdf(r: ResumeDocument, fontBytes?: ArrayBuffer[]) {
  const [
    { PDFDocument, rgb, PDFName, PDFNumber, PDFOperator, PDFOperatorNames },
    fontkit,
  ] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  if (!fontBytes)
    fonts ??= Promise.all(
      ["Regular", "Bold"].map(async (w) => {
        const res = await fetch(`/fonts/LiberationSans-${w}.ttf`);
        if (!res.ok) throw Error("Resume fonts could not load. Please retry.");
        return res.arrayBuffer();
      }),
    );
  const bytes = fontBytes || (await fonts!);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit.default);
  const regular = await pdf.embedFont(bytes[0], { subset: true }),
    bold = await pdf.embedFont(bytes[1], { subset: true });
  pdf.setTitle(
    `${r.basics.name || "Candidate"} — ${r.basics.headline || "Resume"}`,
  );
  pdf.setAuthor(r.basics.name);
  pdf.setSubject("Professional resume");
  pdf.setKeywords(["resume", r.basics.headline]);
  pdf.setLanguage("en");
  const size: [number, number] =
    r.pageSize === "A4" ? [595.28, 841.89] : [612, 792];
  const structure = pdf.context.obj({ Type: "StructTreeRoot" }),
    structureRef = pdf.context.register(structure),
    children: PDFRef[] = [],
    parentNums: (number | PDFArray)[] = [];
  pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
  pdf.catalog.set(PDFName.of("StructTreeRoot"), structureRef);
  let page = pdf.addPage(size),
    y = size[1] - r.margin,
    mcid = 0,
    pageIndex = 0,
    pageParents: PDFRef[] = [];
  const finishPage = () => {
    parentNums.push(pageIndex, pdf.context.obj(pageParents));
    page.node.set(PDFName.of("StructParents"), PDFNumber.of(pageIndex));
  };
  const color = rgb(0.1, 0.1, 0.1);
  const accent =
    r.presentation.accent === "navy"
      ? rgb(0.125, 0.227, 0.35)
      : r.presentation.accent === "slate"
        ? rgb(0.243, 0.282, 0.34)
        : color;
  let header = true;
  const lines = resumeLines(r);
  const extracted: string[] = [];
  for (const line of lines) {
    if (line.kind === "space") {
      y -= 6;
      continue;
    }
    const font = ["name", "role", "heading"].includes(line.kind)
        ? bold
        : regular,
      fontSize =
        line.kind === "name"
          ? r.presentation.nameSize
          : line.kind === "heading"
            ? r.fontSize + 1
            : r.fontSize;
    const leading = fontSize * r.presentation.lineSpacing,
      prefix = line.kind === "bullet" ? "- " : "",
      width =
        size[0] -
        2 * r.margin -
        (line.kind === "bullet" ? r.presentation.bulletIndent : 0);
    const words = (prefix + line.text).split(/\s+/);
    let row = "";
    const rows: string[] = [];
    for (const word of words) {
      if (font.widthOfTextAtSize(word, fontSize) > width) {
        if (row) {
          rows.push(row);
          row = "";
        }
        let part = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(part + ch, fontSize) > width) {
            rows.push(part);
            part = ch;
          } else part += ch;
        }
        row = part;
      } else if (
        row &&
        font.widthOfTextAtSize(row + " " + word, fontSize) > width
      ) {
        rows.push(row);
        row = word;
      } else row += (row ? " " : "") + word;
    }
    if (row) rows.push(row);
    const topGap =
      line.kind === "heading"
        ? r.presentation.sectionSpacing
        : line.kind === "role"
          ? 4
          : 0;
    if (line.kind === "heading") header = false;
    if (
      y -
        topGap -
        leading * (line.kind === "heading" ? 3 : line.kind === "role" ? 2 : 1) <
      r.margin
    ) {
      finishPage();
      page = pdf.addPage(size);
      pageIndex++;
      pageParents = [];
      mcid = 0;
      y = size[1] - r.margin;
    }
    y -= topGap;
    for (const [rowIndex, text] of rows.entries()) {
      if (y - leading < r.margin) {
        finishPage();
        page = pdf.addPage(size);
        pageIndex++;
        pageParents = [];
        mcid = 0;
        y = size[1] - r.margin;
      }
      const tag =
        line.kind === "name" ? "H1" : line.kind === "heading" ? "H2" : "P";
      const child = pdf.context.register(
        pdf.context.obj({
          Type: "StructElem",
          S: tag,
          P: structureRef,
          Pg: page.ref,
          K: mcid,
        }),
      );
      children.push(child);
      pageParents.push(child);
      page.pushOperators(
        PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
          PDFName.of(tag),
          pdf.context.obj({ MCID: mcid }).toString(),
        ]),
      );
      page.drawText(text, {
        x:
          r.template === "executive" && header
            ? (size[0] - font.widthOfTextAtSize(text, fontSize)) / 2
            : r.margin +
              (line.kind === "bullet" && rowIndex > 0
                ? r.presentation.bulletIndent
                : 0),
        y: y - fontSize,
        size: fontSize,
        font,
        color: ["name", "heading"].includes(line.kind) ? accent : color,
      });
      page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
      mcid++;
      y -= leading;
      extracted.push(text);
    }
  }
  finishPage();
  structure.set(PDFName.of("K"), pdf.context.obj(children));
  structure.set(
    PDFName.of("ParentTree"),
    pdf.context.register(pdf.context.obj({ Nums: parentNums })),
  );
  structure.set(PDFName.of("ParentTreeNextKey"), PDFNumber.of(pageIndex + 1));
  const data = await pdf.save();
  return {
    bytes: data,
    pages: pdf.getPageCount(),
    expectedText: extracted.join("\n"),
  };
}
export async function exportDocx(r: ResumeDocument) {
  const {
    Document,
    Paragraph,
    TextRun,
    Packer,
    HeadingLevel,
    AlignmentType,
    ExternalHyperlink,
  } = await import("docx");
  let header = true;
  const children = resumeLines(r).map((line) => {
    if (line.kind === "heading") header = false;
    const link = /^https:\/\//.test(line.text);
    return new Paragraph({
      alignment:
        r.template === "executive" && header
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
      keepNext: ["name", "heading", "role"].includes(line.kind),
      heading:
        line.kind === "heading"
          ? HeadingLevel.HEADING_1
          : line.kind === "name"
            ? HeadingLevel.TITLE
            : undefined,
      spacing: {
        after: line.kind === "heading" ? 100 : 50,
        before:
          line.kind === "heading" ? r.presentation.sectionSpacing * 20 : 0,
        line: Math.round(r.presentation.lineSpacing * 240),
      },
      bullet: line.kind === "bullet" ? { level: 0 } : undefined,
      indent:
        line.kind === "bullet"
          ? {
              left: r.presentation.bulletIndent * 20,
              hanging: r.presentation.bulletIndent * 20,
            }
          : undefined,
      children: link
        ? [
            new ExternalHyperlink({
              link: line.text,
              children: [new TextRun({ text: line.text, style: "Hyperlink" })],
            }),
          ]
        : [
            new TextRun({
              text: line.text,
              bold: ["name", "heading", "role"].includes(line.kind),
              color: ["name", "heading"].includes(line.kind)
                ? r.presentation.accent === "navy"
                  ? "203A59"
                  : r.presentation.accent === "slate"
                    ? "3E4857"
                    : "171717"
                : "171717",
              font: "Arial",
              size:
                line.kind === "name"
                  ? r.presentation.nameSize * 2
                  : line.kind === "heading"
                    ? (r.fontSize + 1) * 2
                    : r.fontSize * 2,
            }),
          ],
    });
  });
  const doc = new Document({
    creator: r.basics.name,
    title: `${r.basics.name} Resume`,
    description: "Single-column editable professional resume",
    styles: {
      default: { document: { run: { font: "Arial", size: r.fontSize * 2 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: r.pageSize === "A4" ? 11906 : 12240,
              height: r.pageSize === "A4" ? 16838 : 15840,
            },
            margin: {
              top: r.margin * 20,
              bottom: r.margin * 20,
              left: r.margin * 20,
              right: r.margin * 20,
            },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}
export function filename(r: ResumeDocument, extension: string) {
  const base = [
    r.basics.name || "Candidate",
    r.basics.headline || "Professional",
    "Resume",
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 160);
  return `${base}.${extension}`;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function textExport(r: ResumeDocument) {
  return new Blob([resumeText(r)], { type: "text/plain;charset=utf-8" });
}
