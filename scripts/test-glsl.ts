import assert from "node:assert/strict";

import { withoutSharedHelpers } from "../lib/dither/glsl";

// `field` and `colorField` compile into one shader. These cases pin down
// which definitions the engine may drop from `colorField` as duplicates.
// Run with `pnpm test`.

const cases: [string, () => void][] = [];
const test = (name: string, run: () => void) => {
  cases.push([name, run]);
};

const COLOR =
  "vec3 colorField(vec2 uv, vec2 res, float t) { return vec3(1.0); }";

const same = (actual: string, expected: string) =>
  assert.equal(
    actual.replaceAll(/\s+/g, " ").trim(),
    expected.replaceAll(/\s+/g, " ").trim()
  );

test("drops a helper prepended to both", () => {
  const helpers =
    "// shared\nfloat ring(vec2 p) { return abs(length(p) - 0.3); }\n";
  same(
    withoutSharedHelpers(
      `${helpers}float field() { return 1.0; }`,
      `${helpers}${COLOR}`
    ),
    COLOR
  );
});

test("keeps a different helper with the same name", () => {
  const color = `float ring(vec2 p) { return 0.0; }\n${COLOR}`;
  same(
    withoutSharedHelpers("float ring(vec2 p) { return 1.0; }", color),
    color
  );
});

test("ignores comments and spacing", () => {
  same(
    withoutSharedHelpers(
      "float a(float x){return x;}",
      `/* doc */ float a(float x) {\n  return x; // same\n}\n${COLOR}`
    ),
    COLOR
  );
});

test("matches member access with or without spaces", () => {
  same(
    withoutSharedHelpers(
      "float h(vec2 p){return p.x;}",
      `float h(vec2 p){return p . x;}\n${COLOR}`
    ),
    COLOR
  );
});

test("keeps operators that only differ in spacing", () => {
  const color = `float g(float a, float b){return a++ +b;}\n${COLOR}`;
  same(
    withoutSharedHelpers("float g(float a, float b){return a + ++b;}", color),
    color
  );
});

test("keeps numbers whole", () => {
  same(
    withoutSharedHelpers(
      "const float K = 1e-4;",
      `const float K = 1e-4;\n${COLOR}`
    ),
    COLOR
  );
  const color = `const float K = 1.5;\n${COLOR}`;
  same(withoutSharedHelpers("const float K = 1.0;", color), color);
});

test("keeps precision statements", () => {
  const color = `precision highp float;\n${COLOR}`;
  same(
    withoutSharedHelpers(
      "precision highp float;\nprecision mediump float;",
      color
    ),
    color
  );
});

test("leaves sources with directives alone", () => {
  const color = `#define PI 3.14159\nfloat h(float x){return x;}\n${COLOR}`;
  assert.equal(
    withoutSharedHelpers(
      "#define PI 3.14159\nfloat h(float x){return x;}",
      color
    ),
    color
  );
  const after = `float h(){return 0.5;}\n${COLOR}`;
  assert.equal(
    withoutSharedHelpers("/*c*/ #if 0\nfloat h(){return 0.5;}\n#endif", after),
    after
  );
});

test("keeps struct declarations whole", () => {
  const color = `struct {float x;} b;\n${COLOR}`;
  same(withoutSharedHelpers("struct {float x;} a;", color), color);
  same(
    withoutSharedHelpers(
      "struct S {float x;};",
      `struct S {float x;};\n${COLOR}`
    ),
    COLOR
  );
});

test("ends line comments at a carriage return", () => {
  same(
    withoutSharedHelpers("float q(){return 1.0;}", `// note\r${COLOR}`),
    COLOR
  );
});

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    process.stdout.write(`ok   ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`FAIL ${name}\n${String(error)}\n`);
  }
}
process.stdout.write(`${cases.length - failed}/${cases.length} passed\n`);
process.exitCode = failed > 0 ? 1 : 0;
