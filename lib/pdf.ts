import type { Content } from "./content";
// Small text-only PDF renderer: page wrapping, standard embedded viewer fonts, no third-party service.
export function resumePdf(c: Content) {
  const p = c.profile;
  const lines: string[] = [];
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[—–]/g, "-")
      .replace(/[’‘]/g, "'")
      .replace(/[^\x20-\x7E\n]/g, "");
  const add = (s: string) => {
    for (const para of clean(s).split("\n")) {
      let row = "";
      for (const word of para.split(/\s+/)) {
        if ((row + " " + word).length > 92) {
          lines.push(row);
          row = word;
        } else row += (row ? " " : "") + word;
      }
      lines.push(row);
    }
  };
  add(p.name + " " + p.surname);
  add(p.role);
  add(p.location + " | " + p.email + " | " + p.phone);
  add(p.linkedin);
  add(p.github);
  add("");
  add("PROFILE");
  add(p.bio);
  add("");
  for (const [title, key] of [
    ["SKILLS", "skills"],
    ["EXPERIENCE", "experience"],
    ["PROJECTS", "projects"],
    ["EDUCATION", "education"],
    ["CERTIFICATIONS", "certifications"],
  ] as const) {
    if (!c.sections[key]) continue;
    add(title);
    for (const x of c[key].filter((x) => x.visible)) {
      add(x.title + (x.period ? " | " + x.period : ""));
      if (x.subtitle) add(x.subtitle);
      if (x.description) add(x.description);
      if (x.tags) add(x.tags);
      if (x.process) add(x.process);
      if (x.outcome) add(x.outcome);
      if (x.link) add(x.link);
      if (x.code) add(x.code);
      add("");
    }
  }
  const pages = [];
  for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48));
  const objs: string[] = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids = [];
  for (const page of pages) {
    const pageId = objs.length;
    const streamId = pageId + 1;
    kids.push(pageId + " 0 R");
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    const esc = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const stream =
      "BT /F1 10 Tf 14 TL 45 790 Td " +
      page.map((l, i) => (i ? "T* " : "") + "(" + esc(l) + ") Tj").join("\n") +
      " ET";
    objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objs[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objs.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => String(o).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
