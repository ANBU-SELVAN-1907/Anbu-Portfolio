// Large files travel directly to R2, outside Vercel function payload limits.
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
export const LEGACY_MAX_MEDIA_BYTES = 4 * 1024 * 1024;
export const MEDIA_CHUNK_BYTES = 512 * 1024;
export const MEDIA_ACCEPT =
  "image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4,application/pdf,application/json,text/csv,text/plain,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";
export const mediaTypes = MEDIA_ACCEPT.split(",");
export function mediaType(name: string, type: string) {
  if (mediaTypes.includes(type)) return type;
  const extensions: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    pdf: "application/pdf",
    json: "application/json",
    csv: "text/csv",
    txt: "text/plain",
    zip: "application/zip",
    docx: mediaTypes[14],
    xlsx: mediaTypes[15],
    pptx: mediaTypes[16],
  };
  return extensions[name.split(".").pop()?.toLowerCase() || ""] || "";
}
export function validMediaHead(type: string, bytes: Uint8Array) {
  const h = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (type === "image/png")
    return [...bytes.slice(0, 8)].join() === "137,80,78,71,13,10,26,10";
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp") return h(0, 4) === "RIFF" && h(8, 12) === "WEBP";
  if (type === "application/pdf") return h(0, 5) === "%PDF-";
  if (type === "video/mp4" || type === "audio/mp4") return h(4, 8) === "ftyp";
  if (type === "video/webm")
    return [...bytes.slice(0, 4)].join() === "26,69,223,163";
  if (type === "audio/wav") return h(0, 4) === "RIFF" && h(8, 12) === "WAVE";
  if (type === "audio/ogg") return h(0, 4) === "OggS";
  if (type === "audio/mpeg")
    return h(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224);
  if (type === "application/zip" || type.includes("openxmlformats"))
    return (
      bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4
    );
  return (
    ["application/json", "text/csv", "text/plain"].includes(type) &&
    !bytes.includes(0)
  );
}
