export async function readResumeFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024)
    throw Error("Import files must be under 5 MB.");
  const ext = file.name.toLowerCase().split(".").at(-1);
  if (ext === "txt") return (await file.text()).slice(0, 30000);
  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return result.value.slice(0, 30000);
  }
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const loading = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const doc = await loading.promise;
    try {
      if (doc.numPages > 20) throw Error("Import supports up to 20 pages.");
      let text = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p),
          content = await page.getTextContent();
        text +=
          content.items
            .map((x) => ("str" in x ? x.str + (x.hasEOL ? "\n" : " ") : ""))
            .join("") + "\n";
        if (text.length > 30000) break;
      }
      return text.slice(0, 30000);
    } finally {
      await loading.destroy();
    }
  }
  throw Error("Choose a PDF, DOCX, TXT, or JSON file.");
}
export async function verifyPdf(bytes: Uint8Array, expected: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await loading.promise;
  try {
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p),
        content = await page.getTextContent();
      text +=
        content.items.map((x) => ("str" in x ? x.str : "")).join(" ") + " ";
    }
    const normalize = (v: string) =>
      v.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
    return {
      passed: normalize(text) === normalize(expected),
      text,
      pages: doc.numPages,
    };
  } finally {
    await loading.destroy();
  }
}
