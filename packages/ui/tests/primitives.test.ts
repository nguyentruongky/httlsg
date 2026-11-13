import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { primitiveCases } from "./primitive-cases";

// Captured before extraction: changes to markup, attributes, or styling fail here.
const expected: Record<string, string> = JSON.parse(
  readFileSync(new URL("./primitive-markup.json", import.meta.url), "utf8"),
);
for (const [name, element] of Object.entries(primitiveCases())) {
  test(`${name} preserves its pre-refactor markup`, () => {
    assert.equal(renderToStaticMarkup(element), expected[name]);
  });
}
