import { readFileSync } from "node:fs";
import { resolveEnvFiles, type EnvFileOptions } from "./files.ts";
import { parseEnv } from "./parse.ts";

/** Where to look for `.env` files, and how they meet `process.env`. */
export interface EnvFileLoadOptions extends EnvFileOptions {
  /**
   * Lets a file replace a variable that is already set. Defaults to `false`,
   * so shell exports win over every file.
   */
  override?: boolean;
}

/**
 * Reads every `.env` file that applies into `process.env`, the way
 * `process.loadEnvFile` does for one file. Call this once, before anything
 * reads a variable.
 *
 * @returns Everything the files held, including values `process.env` kept.
 */
export function loadEnvFiles(
  options: EnvFileLoadOptions = {},
): Record<string, string> {
  const variables = readEnvFiles(options);
  const entries = Object.entries(variables);
  for (const [key, value] of entries) {
    // An empty string is a value somebody chose, so only an absent variable
    // counts as unset
    if (options.override === true || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return variables;
}

/** Reads every `.env` file that applies, without touching `process.env`. */
export function readEnvFiles(
  options: EnvFileOptions = {},
): Record<string, string> {
  const files = resolveEnvFiles(options);

  const variables: Record<string, string> = {};
  // Lowest precedence first, so each file overwrites what the last left behind
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    Object.assign(variables, parseEnv(content));
  }
  return variables;
}
