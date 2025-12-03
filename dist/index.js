import { parsers as tsParsers } from "prettier/plugins/typescript.js";
import { organizeImports } from "./core.js";
const myParser = {
    ...tsParsers.typescript,
    preprocess: async (text, options) => {
        // Run the original preprocess if it exists
        const processedText = tsParsers.typescript.preprocess
            ? await tsParsers.typescript.preprocess(text, options)
            : text;
        // Only run if enabled (default true for now, or we can add an option)
        // For now, we always run it as this is the purpose of the plugin.
        // We can add an option check later.
        try {
            return organizeImports(processedText, options.filepath);
        }
        catch (error) {
            console.error("Error in prettier-plugin-typescript-imports:", error);
            return processedText;
        }
    },
};
export const parsers = {
    typescript: myParser,
};
export const languages = [
    {
        name: "TypeScript",
        parsers: ["typescript"],
        extensions: [".ts", ".tsx"],
        vscodeLanguageIds: ["typescript", "typescriptreact"],
    },
];
export const options = {
    fixTypeImports: {
        type: "boolean",
        category: "Global",
        default: true,
        description: "Organize and separate type imports.",
    },
};
