import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Project, Node } from "ts-morph";

import type { SourceFile, ImportSpecifier } from "ts-morph";

export const CACHE_FILE = ".fix-type-imports-cache.json";

export interface CacheData {
  [filePath: string]: string; // hash
}

export interface FixTypeImportsOptions {
  projectRoot: string;
  sourceDir: string;
  checkUsage: boolean;
  noCache: boolean;
}

export function getFileHash(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

export function loadCache(projectRoot: string): CacheData {
  const cachePath = path.join(projectRoot, CACHE_FILE);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

export function saveCache(projectRoot: string, cache: CacheData) {
  const cachePath = path.join(projectRoot, CACHE_FILE);
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export async function fixTypeImports(
  options: FixTypeImportsOptions,
): Promise<{ totalChanges: number; skippedFiles: number }> {
  const { projectRoot, sourceDir, checkUsage, noCache } = options;

  const tsConfigPath = path.resolve(projectRoot, "tsconfig.json");

  console.log(`Using tsconfig: ${tsConfigPath}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Source directory: ${sourceDir}`);
  if (checkUsage) {
    console.log(
      "Mode: Checking usage for implicit type imports (Batch Optimized)",
    );
  }

  const project = new Project({
    tsConfigFilePath: tsConfigPath,
    skipAddingFilesFromTsConfig: true,
  });

  const globPattern = path.join(projectRoot, sourceDir, "**/*.{ts,tsx}");
  console.log(`Searching for files matching: ${globPattern}`);

  // Get all TypeScript source files in the specified directory
  const sourceFiles: SourceFile[] = project.addSourceFilesAtPaths(globPattern);
  console.log(`Found ${sourceFiles.length} files.`);

  const cache = noCache ? {} : loadCache(projectRoot);
  let totalChanges = 0;
  let skippedFiles = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(projectRoot, filePath);
    const currentHash = getFileHash(sourceFile.getText());

    if (!noCache && cache[relativePath] === currentHash) {
      skippedFiles++;
      continue; // Skip processing if file hasn't changed
    }

    // const originalText = sourceFile.getText();
    // checkUsage is tricky to port to single-file model without full project context in 'organizeImports'
    // For now, we will keep the CLI using the full project for checkUsage if needed,
    // but let's try to see if we can abstract the transformation logic.
    // However, for the plugin, we primarily want the Fast Mode (syntax only).

    // To properly support both, we might need to pass the 'sourceFile' (which might be attached to a full project)
    // to a helper, OR create a virtual one.

    // Let's refactor by extracting the transformation logic that works on a SourceFile.
    
    const fileChanges = applyTransforms(sourceFile, checkUsage);

    if (fileChanges) {
      console.log(`Saving changes to: ${sourceFile.getFilePath()}`);
      await sourceFile.save();
      totalChanges++;

      // Update cache with new content hash
      cache[relativePath] = getFileHash(sourceFile.getText());
    } else {
      // Even if no changes, update cache to say "we checked this version"
      cache[relativePath] = currentHash;
    }
  }

  if (!noCache) {
    saveCache(projectRoot, cache);
  }

  console.log(`\nFixed type imports in ${totalChanges} files.`);
  console.log(`Skipped ${skippedFiles} files (cached).`);

  return { totalChanges, skippedFiles };
}

/**
 * Applies transformations to a SourceFile.
 * Returns true if changes were made.
 */
export function applyTransforms(sourceFile: SourceFile, checkUsage: boolean): boolean {
  let fileChanges = false;

  // Phase 1: Batch Usage Detection (if enabled)
  if (checkUsage) {
      const importDeclarations = sourceFile.getImportDeclarations();
      const candidates: ImportSpecifier[] = [];

      // Collect all non-type imports
      for (const decl of importDeclarations) {
        if (!decl.isTypeOnly()) {
          const namedImports = decl.getNamedImports();
          for (const ni of namedImports) {
            if (!ni.isTypeOnly()) {
              candidates.push(ni);
            }
          }
        }
      }

      if (candidates.length > 0) {
        // Speculatively set ALL candidates to type-only
        candidates.forEach((ni) => ni.setIsTypeOnly(true));

        // Run diagnostics ONCE
        const diagnostics = sourceFile.getPreEmitDiagnostics();
        const revertSet = new Set<string>();

        for (const diag of diagnostics) {
          const code = diag.getCode();
          if (code === 1361 || code === 1452) {
            const diagSourceFile = diag.getSourceFile();
            const start = diag.getStart();

            if (diagSourceFile === sourceFile && start !== undefined) {
              const node = sourceFile.getDescendantAtPos(start);
              if (node && Node.isIdentifier(node)) {
                const symbol = node.getSymbol();
                if (symbol) {
                  const declarations = symbol.getDeclarations();
                  declarations.forEach((decl) => {
                    if (Node.isImportSpecifier(decl)) {
                      revertSet.add(decl.getName());
                    }
                  });
                }
              }
            }
          }
        }

        // Revert those that caused errors
        candidates.forEach((ni) => {
          if (revertSet.has(ni.getName())) {
            ni.setIsTypeOnly(false);
          } else {
            // If it wasn't reverted, it means it's safe as a type import.
            // We mark fileChanges=true because we changed the file.
            // (Note: if candidates includes imports that were NOT used as types but used as values,
            // they are reverted, so no change. If used as type, kept as type, so change.)
            fileChanges = true;
          }
        });
      }
  }

  // Phase 2: Split/Organize imports
  // Need to refresh declarations because Phase 1 might have modified them
  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDeclaration of importDeclarations) {
    // Fix double type: 'import type { type X }' -> 'import type { X }'
    if (importDeclaration.isTypeOnly()) {
      const namedImports = importDeclaration.getNamedImports();
      let hasInnerType = false;
      for (const ni of namedImports) {
        if (ni.isTypeOnly()) {
          ni.setIsTypeOnly(false);
          hasInnerType = true;
        }
      }
      if (hasInnerType) {
        fileChanges = true;
      }
    }

    const namedImports: ImportSpecifier[] =
      importDeclaration.getNamedImports();

    if (namedImports.length > 0) {
      const typeImports: ImportSpecifier[] = namedImports.filter(
        (ni: ImportSpecifier) => ni.isTypeOnly(),
      );

      if (typeImports.length > 0) {
        // Check if there are other non-type imports in the same declaration
        const nonTypeImports: ImportSpecifier[] = namedImports.filter(
          (ni: ImportSpecifier) => !ni.isTypeOnly(),
        );

        if (
          nonTypeImports.length === 0 &&
          !importDeclaration.getDefaultImport()
        ) {
          // All imports are type-only, convert the whole declaration to 'import type'
          if (!importDeclaration.isTypeOnly()) {
            // Strategy: Re-create the import declaration to ensure clean 'import type { ... }'

            const namedImportNames = typeImports.map((ni) => ni.getName());

            importDeclaration.set({
              isTypeOnly: true,
              namedImports: namedImportNames, // This resets the named imports to just names (no 'type' keyword)
            });

            fileChanges = true;
          }
        } else {
          // Mix of type and non-type imports, extract type-only into a new 'import type' declaration
          const newImportSpecifiers: string[] = typeImports.map(
            (ni: ImportSpecifier) => ni.getName(),
          );
          const moduleSpecifier = importDeclaration.getModuleSpecifier();

          if (newImportSpecifiers.length > 0) {
            // Remove 'type' keyword from original type specifiers
            typeImports.forEach((ni: ImportSpecifier) => ni.remove());

            // Create new import type declaration
            sourceFile.addImportDeclaration({
              moduleSpecifier: moduleSpecifier.getLiteralValue(),
              namedImports: newImportSpecifiers,
              isTypeOnly: true,
            });

            fileChanges = true;
          }
        }
      }
    }
  }

  return fileChanges;
}

export function organizeImports(code: string, filePath: string = "file.ts"): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
       target: 99, // ESNext
       module: 99, // ESNext
       moduleResolution: 99, // NodeNext
    }
  });
  
  const sourceFile = project.createSourceFile(filePath, code);
  
  // For organizeImports used in Prettier, we usually disable checkUsage 
  // because it requires full project context which we don't have here.
  applyTransforms(sourceFile, false);
  
  return sourceFile.getFullText();
}
