import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Worker startup forbids randomness before a request enters its handler.
const out = path.resolve(".sites-runtime/content-runtime-tests");
await fs.mkdir(out, { recursive: true });
for (const name of ["content", "editorial"]) {
  const source = (await fs.readFile(`lib/${name}.ts`, "utf8"))
    .replace('"./content"', '"./content.mjs"');
  await fs.writeFile(path.join(out, `${name}.mjs`), ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText);
}
const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
try {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID() { throw Error("Randomness outside a request handler"); } },
  });
  const content = await import(pathToFileURL(path.join(out, "content.mjs")).href);
  const editorial = await import(pathToFileURL(path.join(out, "editorial.mjs")).href);
  const defaults = editorial.newEditorialContent();
  for (const key of ["projects", "experience", "education", "skills", "certifications", "faq"]) {
    const entries = defaults[key];
    assert.ok(entries.every((entry) => entry.id));
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  }
  assert.equal(content.entry({ id: "stable" }).id, "stable");
  Object.defineProperty(globalThis, "crypto", original);
  assert.match(content.entry({ title: "New entry" }).id, /^[0-9a-f-]{36}$/);
} finally {
  Object.defineProperty(globalThis, "crypto", original);
}
console.log("Default content loads without global-scope randomness; new entries retain unique IDs.");
