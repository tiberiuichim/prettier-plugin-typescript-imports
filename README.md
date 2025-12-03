# Prettier plugin: Separate Typescript imports

A Prettier plugin (and CLI tool) to automatically format TypeScript imports by separating type imports from value imports.

## Features

This plugin automatically organizes your TypeScript imports to strictly separate type imports from value imports. It splits mixed imports, cleans up redundant `import type { type X }` syntax, and consolidates imports where all members are types into a single `import type` statement.

```ts
// Before
import { A, type B } from './mod';
import type { type C } from './other';

// After
import { A } from './mod';
import type { B } from './mod';
import type { C } from './other';
```

### Deep Usage Checking

When using the CLI with `--check-usage`, the tool performs a deep analysis of your codebase. It inspects how imported symbols are actually used. If a symbol is only used in type positions (e.g., `interface`, `type` alias, function signatures), it will be converted to a type import even if it wasn't marked as such. This is slower than the default syntax-only mode because it requires loading the full type checker.

### Caching

The CLI tool maintains a cache file named `.fix-type-imports-cache.json` in your project root. This file stores the hash of processed files to skip them in subsequent runs if they haven't changed, significantly speeding up execution for large codebases. You can disable this with `--no-cache` or simply delete the file to reset. **Make sure to add `.fix-type-imports-cache.json` to your `.gitignore` file.**

## Installation

```bash
npm install prettier-plugin-typescript-imports
```

## Prettier Plugin Usage

Add the plugin to your `.prettierrc` configuration:

```json
{
  "plugins": ["prettier-plugin-typescript-imports"]
}
```

Or via the CLI:

```bash
prettier --plugin prettier-plugin-typescript-imports --write "src/**/*.ts"
```

The plugin will automatically run during Prettier formatting and organize your type imports.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `fixTypeImports` | Enable/disable the plugin. | `true` |

## CLI Usage

You can use the included CLI tool to fix imports in your project.

```bash
npx fix-type-imports [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | |
| `--project` | `-p` | Project root path (must contain a `tsconfig.json`) | Current working directory |
| `--dir` | `-d` | Directory to search for source files | `src` |
| `--check-usage` | `-c` | Check usage of imports to detect implicit type-only imports (slower) | `false` |
| `--no-cache` | | Disable caching (always process all files) | `false` |

### Examples

**Basic Usage:**

```bash
npx fix-type-imports
```

**Specify Source Directory:**

```bash
npx fix-type-imports --dir "app"
```

**Enable Deep Usage Checking:**

```bash
npx fix-type-imports --check-usage
```

## Grouping the imports

This plugin only separates type imports from value imports. To group and sort your imports, we recommend using [eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import) with the following configuration:

```js
// eslint.config.mjs
import importPlugin from "eslint-plugin-import";

export default [
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin", "type"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
```

## Development

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Run tests: `npm test`.
4. Type check: `npm run type-check`.
5. Build: `npm run build`.
6. Run CLI locally: `npm run fix-type-imports -- [options]`.

## Credits

Created by Tiberiu Ichim, vibe-coded with Gemini 3 Preview.

## Links

- [Prettier](https://prettier.io/)
- [TypeScript](https://www.typescriptlang.org/)

