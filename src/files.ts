import { statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Where to look for `.env` files. */
export interface EnvFileOptions {
  /** Defaults to `process.cwd()`. */
  cwd?: string;
  /**
   * Selects the `.env.<mode>` files. Defaults to `process.env.NODE_ENV`.
   * Without one, only `.env` and `.env.local` are read.
   */
  mode?: string;
  /**
   * Directory where the search stops, inclusive. Defaults to the root of the
   * file system.
   */
  stopAt?: string;
}

/**
 * Lists the `.env` files that apply, from lowest to highest precedence.
 *
 * @throws If `mode` is `local`, which collides with the `.local` suffix.
 */
export function resolveEnvFiles(options: EnvFileOptions = {}): string[] {
  const {
    cwd = process.cwd(),
    mode = process.env["NODE_ENV"],
    stopAt,
  } = options;

  if (mode === "local") {
    throw new Error(
      "`local` cannot be a mode name, because it collides with the .local suffix of an env file.",
    );
  }

  const fileNames = fileNamesFor(mode);
  const directories = directoriesUpFrom(resolve(cwd), stopAt).toReversed();
  const files = directories.flatMap((directory) =>
    fileNames.map((name) => join(directory, name)),
  );
  return files.filter(isReadableFile);
}

function fileNamesFor(mode: string | undefined): string[] {
  const names = [".env", ".env.local"];
  if (mode != null && mode !== "") {
    names.push(`.env.${mode}`, `.env.${mode}.local`);
  }
  return names;
}

function directoriesUpFrom(cwd: string, stopAt: string | undefined): string[] {
  const boundary = stopAt == null ? undefined : resolve(stopAt);
  const directories = [cwd];

  let directory = cwd;
  while (directory !== boundary) {
    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
    directories.push(directory);
  }

  return directories;
}

/**
 * A named pipe reads once and is how secret managers such as 1Password hand a
 * file over, so it counts even though it is not a regular file
 */
function isReadableFile(path: string): boolean {
  const stats = statSync(path, { throwIfNoEntry: false });
  return stats != null && (stats.isFile() || stats.isFIFO());
}
