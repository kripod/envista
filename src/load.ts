import { readFileSync } from "node:fs";
import { resolveEnvFiles, type EnvFileOptions } from "./files.ts";
import { parseEnv } from "./parse.ts";

/** Where to look for `.env` files, and how they meet `process.env`. */
export interface EnvFileLoadOptions extends EnvFileOptions {
  /**
   * Whether a file may replace a variable that is already set. Defaults to
   * `false`, which keeps shell exports winning over every file.
   */
  override?: boolean;
}

/**
 * Reads the `.env` files that apply into `process.env`, the way
 * `process.loadEnvFile` does for a single file. Call this once, before
 * anything reads a variable.
 *
 * @returns Everything the files held, including values `process.env` kept.
 */
export function loadEnvFiles(
  options: EnvFileLoadOptions = {},
): Record<string, string> {
  const variables = readEnvFiles(options);
  const entries = Object.entries(variables);
  for (const [key, value] of entries) {
    if (options.override === true || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return variables;
}

/** Reads the `.env` files that apply, without touching `process.env`. */
export function readEnvFiles(
  options: EnvFileOptions = {},
): Record<string, string> {
  const files = resolveEnvFiles(options);

  const variables: Record<string, string> = {};
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    Object.assign(variables, parseEnv(content));
  }
  return variables;
}
