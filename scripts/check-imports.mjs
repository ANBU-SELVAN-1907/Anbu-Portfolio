import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { zipSync, strToU8 } from "fflate";

const out = path.resolve(".sites-runtime/import-tests");
await fs.mkdir(out, { recursive: true });
const source = await fs.readFile("lib/resume/docx-import.ts", "utf8");
await fs.writeFile(
  path.join(out, "docx-import.mjs"),
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText,
);
const { extractDocxXml } = await import(
  pathToFileURL(path.join(out, "docx-import.mjs"))
);
const xml =
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>José Candidate &amp; React</w:t></w:r></w:p></w:body></w:document>';
const zip = (content) => zipSync({ "word/document.xml": strToU8(content) });
assert.equal(extractDocxXml(zip(xml)), xml);
assert.throws(
  () => extractDocxXml(new Uint8Array(5 * 1024 * 1024 + 1)),
  /under 5 MB/,
);
assert.throws(
  () => extractDocxXml(zipSync({ "other.xml": strToU8(xml) })),
  /valid, unencrypted/,
);
assert.throws(
  () => extractDocxXml(zip('<!DOCTYPE x [<!ENTITY e "text">]>' + xml)),
  /entities/,
);
assert.throws(
  () => extractDocxXml(zip("x".repeat(3 * 1024 * 1024))),
  /too large/,
);
const dishonest = zip("x".repeat(3 * 1024 * 1024));
new DataView(
  dishonest.buffer,
  dishonest.byteOffset,
  dishonest.byteLength,
).setUint32(22, 10, true);
assert.throws(
  () => extractDocxXml(dishonest),
  /too large|invalid|decompressed/i,
);
const ignored = zipSync({
  "word/document.xml": strToU8(xml),
  "word/media/large.bin": new Uint8Array(3 * 1024 * 1024),
});
assert.equal(
  extractDocxXml(ignored),
  xml,
  "Attachments must never be inflated.",
);
const generated = path.resolve(".sites-runtime/resume-tests/resume.docx");
try {
  const actual = extractDocxXml(new Uint8Array(await fs.readFile(generated)));
  assert.ok(
    actual.includes("José Candidate") && actual.includes("Software Engineer"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(
  "DOCX selective extraction, Unicode, file/content limits, dishonest ZIP sizes, entity rejection and ignored attachments passed.",
);
