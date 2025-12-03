import { describe, it, expect } from "vitest";
import prettier from "prettier";
import * as plugin from "../src/index.js";

describe("prettier-plugin-typescript-imports", () => {
  it("should split mixed imports", async () => {
    const code = `import { A, type B } from './mod';`;
    const expected = `import { A } from "./mod";
import type { B } from "./mod";
`;

    const result = await prettier.format(code, {
      parser: "typescript",
      plugins: [plugin],
    });

    expect(result).toBe(expected);
  });

  it("should fix double type imports", async () => {
    const code = `import type { type A } from './mod';`;
    const expected = `import type { A } from "./mod";
`;

    const result = await prettier.format(code, {
      parser: "typescript",
      plugins: [plugin],
    });

    expect(result).toBe(expected);
  });

  it("should consolidate all-type imports", async () => {
    const code = `import { type A, type B } from './mod';`;
    const expected = `import type { A, B } from "./mod";
`;

    const result = await prettier.format(code, {
      parser: "typescript",
      plugins: [plugin],
    });

    expect(result).toBe(expected);
  });
});
