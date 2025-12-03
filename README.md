# Prettier Plugin: TypeScript Imports

A tool (currently a CLI, future Prettier plugin) to automatically format TypeScript imports by separating type imports from value imports.

## Features

- **Separates Type Imports**: Automatically splits mixed imports into value imports and type imports.
- **Fixes Double Type Imports**: Cleans up `import type { type X }` to `import type { X }`.
- **Consolidates Type Imports**: Converts imports where all named imports are types into a single `import type` declaration.
- **Usage Detection**: Optionally checks how imports are used to detect implicit type-only imports and converts them (slower but more thorough).
- **Caching**: Caches results to skip processing files that haven't changed.

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
| `--project` | `-p` | Project root path | Current working directory |
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

## What it does

**Mixed Imports:**

```ts
// Before
import { A, type B } from './mod';

// After
import { A } from './mod';
import type { B } from './mod';
```

**Double Type Keywords:**

```ts
// Before
import type { type A } from './mod';

// After
import type { A } from './mod';
```

**All-Type Imports:**

```ts
// Before
import { type A, type B } from './mod';

// After
import type { A, B } from './mod';
```

## Development

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Run tests: `npm test`.
4. Run CLI locally: `npm start -- [options]`.
