#!/usr/bin/env node
import { parseArgs } from "node:util";

import { fixTypeImports } from "./core.js";

const { values } = parseArgs({
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    project: {
      type: "string",
      short: "p",
      default: process.cwd(),
    },
    dir: {
      type: "string",
      short: "d",
      default: "src",
    },
    "check-usage": {
      type: "boolean",
      short: "c",
      default: false,
    },
    "no-cache": {
      type: "boolean",
      default: false,
    },
  },
});

if (values.help) {
  console.log(`
Usage: npx fix-type-imports [options]

Options:
  -h, --help         Show this help message
  -p, --project      Project root path (default: current working directory)
  -d, --dir          Directory to search for source files (default: "src")
  -c, --check-usage  Check usage of imports to detect implicit type-only imports (slower)
  --no-cache         Disable caching (always process all files)

Description:
  Rewrites TypeScript files to separate type imports from value imports.
  Example:
    import { A, type B } from './mod';
  
  Becomes:
    import { A } from './mod';
    import type { B } from './mod';
`);
  process.exit(0);
}

fixTypeImports({
  projectRoot: (values.project ?? process.cwd()) as string,
  sourceDir: (values.dir ?? "src") as string,
  checkUsage: (values["check-usage"] ?? false) as boolean,
  noCache: (values["no-cache"] ?? false) as boolean,
}).catch(console.error);
