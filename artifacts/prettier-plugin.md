# Prettier Plugin Plan

## Goal
Convert the existing `fix-type-imports` CLI tool into a Prettier plugin. The plugin will automatically separate type imports from value imports during formatting.

## Architecture

We will use the `languages` and `parsers` configuration in the Prettier plugin API. Specifically, we will override the `typescript` parser and use the `preprocess` hook. This hook allows us to modify the source code string *before* it is passed to Prettier's AST generation. This is efficient and aligns with how other "organize imports" plugins work.

### Plugin Structure (`src/index.ts`)
The plugin will export:
- `languages`: Definition for TypeScript files to associate them with our parser.
- `parsers`: An override for the `typescript` parser that includes a `preprocess` function.
- `options`: Configuration options (e.g., `fixTypeImports` boolean to enable/disable, and maybe `checkUsage` for the deep check).

### Core Refactoring (`src/core.ts`)
The current `fixTypeImports` function is designed for batch processing (CLI). We need to refactor it to support single-file processing in memory.

1.  **Extract Logic**: Create `organizeImports(code: string, fileName: string, options: CoreOptions): string`.
    *   Input: Source code string, file path (for context/caching logic if needed, though Prettier is usually stateless), and options.
    *   Output: Modified source code string.
2.  **Ts-Morph Adaptation**:
    *   Instead of `project.addSourceFilesAtPaths(glob)`, we will use `project.createSourceFile("virtual.ts", code)`.
    *   **Fast Mode**: Create a `Project` without a `tsconfig` (or a default in-memory one) to avoid disk I/O overhead. This is sufficient for syntax-level transforms (splitting imports).
    *   **Deep Mode (`checkUsage`)**: This is tricky in a plugin because it requires full project context. We might skip this for the initial plugin version or make it opt-in (and slow). *Decision: Support Fast Mode first.*
3.  **CLI Update**: Update the CLI tool to use the new `organizeImports` function internally, maintaining backward compatibility.

## Steps

1.  **Refactor `src/core.ts`**: [x]
    *   Extract `organizeImports(code, options)`.
    *   Ensure it works on a string and returns a string.
    *   Remove direct file system writes from the logic; let the CLI handle saving.
2.  **Create Plugin Entry (`src/index.ts`)**: [x]
    *   Implement the Prettier plugin interface.
    *   Import `organizeImports` from `src/core.ts`.
    *   Hook into `preprocess`.
3.  **Update CLI (`src/cli.ts`)**: [x]
    *   Use the refactored core.
4.  **Testing**: [x]
    *   Add tests that use `prettier.format` with the plugin loaded.
    *   Verify it produces the same output as the CLI tool.
5.  **Documentation**: [x]
    *   Update README to include Prettier configuration usage.
6.  **Bug Fixes**: [x]
    *   Fixed `ERR_INVALID_ARG_TYPE` in CLI by explicitly handling undefined option values with defaults.

## Implementation Details

### `src/core.ts` Refactoring
- `fixTypeImports` (CLI entry):
    - Finds files.
    - Reads content.
    - Calls `organizeImports`.
    - Writes content if changed.
- `organizeImports` (Core logic):
    - Takes `code`.
    - Creates `Project`.
    - Creates `SourceFile`.
    - Applies transforms.
    - Returns `sourceFile.getFullText()`.

### Prettier Integration
```typescript
import { parsers as typescriptParsers } from "prettier/plugins/typescript";
import { organizeImports } from "./core";

export const parsers = {
  typescript: {
    ...typescriptParsers.typescript,
    preprocess: (text, options) => {
      return organizeImports(text, options.filepath); // options.filepath might be needed for TS context
    },
  },
};
```

*Note: Prettier v3 imports might differ slightly.*
