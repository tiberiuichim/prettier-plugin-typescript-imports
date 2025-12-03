import fs from "node:fs";
import path from "node:path";

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { fixTypeImports, CACHE_FILE } from "../src/core";

const TEST_DIR = path.join(__dirname, "temp-test-env");

function createTestFile(filePath: string, content: string) {
  const fullPath = path.join(TEST_DIR, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function readTestFile(filePath: string): string {
  return fs.readFileSync(path.join(TEST_DIR, filePath), "utf-8");
}

describe("fix-type-imports", () => {
  beforeAll(() => {
    // Clean start
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR);

    // Create a dummy tsconfig
    createTestFile(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ESNext",
            module: "ESNext",
            moduleResolution: "node",
          },
        },
        null,
        2,
      ),
    );
  });

  afterEach(() => {
    // Clean cache file after each test to prevent state leakage
    const cachePath = path.join(TEST_DIR, CACHE_FILE);
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath);
    }
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should fix mixed type and value imports (Fast Mode)", async () => {
    createTestFile(
      "src/mixed.ts",
      `
import { A, type B } from "./exports";
console.log(A);
    `,
    );

    await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: true,
    });

    const content = readTestFile("src/mixed.ts");
    expect(content).toContain('import { A } from "./exports";');
    expect(content).toContain('import type { B } from "./exports";');
  });

  it("should fix double type imports (Fast Mode)", async () => {
    createTestFile(
      "src/double.ts",
      `
import type { type A } from "./exports";
    `,
    );

    await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: true,
    });

    const content = readTestFile("src/double.ts");
    expect(content).toContain('import type { A } from "./exports";');
    expect(content).not.toContain("type A");
  });

  it("should convert all-type imports to import type (Fast Mode)", async () => {
    createTestFile(
      "src/all-types.ts",
      `
import { type A, type B } from "./exports";
    `,
    );

    await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: true,
    });

    const content = readTestFile("src/all-types.ts");
    expect(content).toContain('import type { A, B } from "./exports";');
  });

  it("should NOT convert import with default value to import type even if named is type (Fast Mode)", async () => {
    createTestFile(
      "src/default-val.ts",
      `
  import Default, { type A } from "./exports";
  console.log(Default);
      `,
    );

    await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: true,
    });

    const content = readTestFile("src/default-val.ts");
    // Should split
    expect(content).toContain('import Default from "./exports";');
    expect(content).toContain('import type { A } from "./exports";');
  });

  it("should cache results", async () => {
    createTestFile(
      "src/cache-test.ts",
      `import { A, type B } from "./exports";`,
    );

    // First run
    const result1 = await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: false,
    });

    expect(result1.totalChanges).toBe(1);
    expect(fs.existsSync(path.join(TEST_DIR, CACHE_FILE))).toBe(true);

    // Second run (should skip)
    const result2 = await fixTypeImports({
      projectRoot: TEST_DIR,
      sourceDir: "src",
      checkUsage: false,
      noCache: false,
    });

    expect(result2.totalChanges).toBe(0);
    expect(result2.skippedFiles).toBeGreaterThan(0);
  });
});
