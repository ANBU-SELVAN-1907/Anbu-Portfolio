import { Unzip, UnzipInflate, strFromU8 } from "fflate";

const MAX_XML_BYTES = 2 * 1024 * 1024;

/** Read only the main document; never decompress attachments or external links. */
export function extractDocxXml(bytes: Uint8Array): string {
  if (bytes.length > 5 * 1024 * 1024)
    throw Error("Import files must be under 5 MB.");
  let found = false;
  let complete = false;
  let length = 0;
  let failure: Error | null = null;
  const chunks: Uint8Array[] = [];
  const unzip = new Unzip((file) => {
    if (file.name !== "word/document.xml") return;
    if (found) {
      failure = Error("This Word document has duplicate content files.");
      return;
    }
    found = true;
    if (file.originalSize && file.originalSize > MAX_XML_BYTES) {
      failure = Error(
        "Word document content is too large. Use a shorter resume.",
      );
      return;
    }
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        failure = Error("This Word document could not be decompressed.");
        return;
      }
      length += chunk.length;
      if (length > MAX_XML_BYTES) {
        failure = Error(
          "Word document content is too large. Use a shorter resume.",
        );
        return;
      }
      chunks.push(chunk);
      if (final) complete = true;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    // Small compressed chunks bound each inflation step, including dishonest ZIP sizes.
    for (let offset = 0; offset < bytes.length; offset += 128) {
      unzip.push(
        bytes.subarray(offset, offset + 128),
        offset + 128 >= bytes.length,
      );
      if (failure) throw failure;
    }
  } catch (error) {
    throw (
      failure ||
      (error instanceof Error ? error : Error("Invalid Word document."))
    );
  }
  if (!found || !complete || !length)
    throw Error("Choose a valid, unencrypted DOCX resume.");
  const content = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.length;
  }
  const xml = strFromU8(content);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("Word documents with XML entities are not supported.");
  return xml;
}

export function docxText(bytes: Uint8Array): string {
  const xml = extractDocxXml(bytes);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw Error("The Word document contains invalid XML.");
  const namespace =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = doc.getElementsByTagNameNS(namespace, "p");
  let text = "";
  for (const paragraph of Array.from(paragraphs)) {
    for (const element of Array.from(
      paragraph.getElementsByTagNameNS(namespace, "*"),
    )) {
      if (element.localName === "t") text += element.textContent || "";
      else if (element.localName === "tab") text += "\t";
      else if (element.localName === "br") text += "\n";
      if (text.length >= 30000) return text.slice(0, 30000);
    }
    text += "\n";
  }
  return text.slice(0, 30000);
}
