import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import ts from "typescript";
const source = await fs.readFile("lib/hero-story.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { originalHeroFrames, storyPosition } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const manifest = JSON.parse(
  await fs.readFile("public/hero-frames/manifest.json", "utf8"),
);
assert.equal(originalHeroFrames.length, 11);
for (let index = 0; index < manifest.length; index++) {
  const file = manifest[index];
  assert.equal(originalHeroFrames[index], `/hero-frames/${file.file}`);
  const bytes = await fs.readFile(`public/hero-frames/${file.file}`);
  assert.equal(bytes.length, file.bytes);
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    file.sha256,
  );
}
let previous = 0;
for (let step = 0; step <= 1000; step++) {
  const state = storyPosition(step / 1000, 11);
  assert.ok(state.index >= previous && state.index <= 10);
  assert.ok(state.next <= 10 && state.blend >= 0 && state.blend <= 1);
  if (state.index >= 6) assert.equal(state.black, 0);
  previous = state.index;
}
for (let index = 0; index < 6; index++)
  assert.ok(storyPosition(((index + 0.5) / 10) * 0.86, 11).black > 0.9);
for (const p of [0.86, 0.9, 0.99, 1])
  assert.equal(storyPosition(p, 11).index, 10);
assert.equal(storyPosition(-1, 11).index, 0);
assert.equal(storyPosition(2, 11).index, 10);
console.log(
  "11 original PNG hashes, ordered scroll frames, six black fades and final-pose hold passed.",
);
