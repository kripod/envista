import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  loadEnvFiles,
  readEnvFiles,
  resolveEnvFiles,
  type EnvFileLoadOptions,
} from "./index.ts";

const mode = "production";
const cascadeFileNames = [
  ".env",
  ".env.local",
  `.env.${mode}`,
  `.env.${mode}.local`,
];
const otherModeFileName = ".env.development";
const shellEnv = process.env;

let repositoryRoot: string;
let packageDirectory: string;
let repositoryOptions: EnvFileLoadOptions;
let packageOptions: EnvFileLoadOptions;

function pathsIn(directory: string, fileNames: string[]): string[] {
  return fileNames.map((fileName) => join(directory, fileName));
}

beforeEach(() => {
  repositoryRoot = mkdtempSync(join(tmpdir(), "envista-"));
  packageDirectory = join(repositoryRoot, "packages", "app");
  repositoryOptions = { cwd: repositoryRoot, mode, stopAt: repositoryRoot };
  packageOptions = { cwd: packageDirectory, mode, stopAt: packageDirectory };

  mkdirSync(packageDirectory, { recursive: true });
  for (const path of [
    ...pathsIn(repositoryRoot, [...cascadeFileNames, otherModeFileName]),
    ...pathsIn(packageDirectory, cascadeFileNames),
  ]) {
    writeFileSync(path, "");
  }
  writeFileSync(
    join(repositoryRoot, ".env"),
    "SHARED=from-base\nONLY_IN_BASE=kept\nSET_IN_SHELL=from-file\nEMPTY_IN_SHELL=from-file",
  );
  writeFileSync(join(repositoryRoot, `.env.${mode}`), "SHARED=from-mode");

  process.env = { ...shellEnv, SET_IN_SHELL: "from-shell", EMPTY_IN_SHELL: "" };
  // Vitest sets NODE_ENV, which would pick a mode for every case that omits one
  delete process.env["NODE_ENV"];
});

afterEach(() => {
  process.env = shellEnv;
  rmSync(repositoryRoot, { recursive: true, force: true, maxRetries: 3 });
});

describe("resolveEnvFiles", () => {
  test("orders one directory from shared default to mode local", () => {
    expect(resolveEnvFiles(repositoryOptions)).toEqual(
      pathsIn(repositoryRoot, cascadeFileNames),
    );
  });

  test("reads no mode files when no mode is given", () => {
    expect(resolveEnvFiles({ ...repositoryOptions, mode: undefined })).toEqual(
      pathsIn(repositoryRoot, [".env", ".env.local"]),
    );
  });

  test("defaults the mode to NODE_ENV", () => {
    process.env["NODE_ENV"] = mode;

    expect(resolveEnvFiles({ ...repositoryOptions, mode: undefined })).toEqual(
      pathsIn(repositoryRoot, cascadeFileNames),
    );
  });

  test("ranks a whole directory above the one that contains it", () => {
    expect(
      resolveEnvFiles({ ...packageOptions, stopAt: repositoryRoot }),
    ).toEqual([
      ...pathsIn(repositoryRoot, cascadeFileNames),
      ...pathsIn(packageDirectory, cascadeFileNames),
    ]);
  });

  test("stops at the boundary, which keeps a file above it out", () => {
    expect(resolveEnvFiles(packageOptions)).toEqual(
      pathsIn(packageDirectory, cascadeFileNames),
    );
  });

  test("skips a directory that shares an env file's name", () => {
    const nameTakenByADirectory = ".env";
    const remainingFileNames = cascadeFileNames.filter(
      (fileName) => fileName !== nameTakenByADirectory,
    );
    const takenByADirectory = join(packageDirectory, nameTakenByADirectory);
    rmSync(takenByADirectory);
    mkdirSync(takenByADirectory);

    expect(resolveEnvFiles(packageOptions)).toEqual(
      pathsIn(packageDirectory, remainingFileNames),
    );
  });

  // Windows has no mkfifo
  test.skipIf(process.platform === "win32")(
    "counts a named pipe, which is how a secret manager hands a file over",
    () => {
      const handedOverByAPipe = join(packageDirectory, `.env.${mode}.local`);
      rmSync(handedOverByAPipe);
      execFileSync("mkfifo", [handedOverByAPipe]);

      expect(resolveEnvFiles(packageOptions)).toEqual(
        pathsIn(packageDirectory, cascadeFileNames),
      );
    },
  );

  test("rejects local as a mode, since it collides with the suffix", () => {
    expect(() =>
      resolveEnvFiles({ ...repositoryOptions, mode: "local" }),
    ).toThrow(/cannot be a mode name/u);
  });
});

describe("readEnvFiles", () => {
  test("lets a higher ranked file overwrite a key and keep the rest", () => {
    expect(readEnvFiles(repositoryOptions)).toEqual({
      SHARED: "from-mode",
      ONLY_IN_BASE: "kept",
      SET_IN_SHELL: "from-file",
      EMPTY_IN_SHELL: "from-file",
    });
  });

  test("leaves process.env alone", () => {
    readEnvFiles(repositoryOptions);

    expect(process.env["SHARED"]).toBeUndefined();
  });
});

describe("loadEnvFiles", () => {
  test("copies a variable the shell did not set", () => {
    loadEnvFiles(repositoryOptions);

    expect(process.env["SHARED"]).toBe("from-mode");
  });

  test("keeps what the shell set, an empty value included", () => {
    loadEnvFiles(repositoryOptions);

    expect(process.env["SET_IN_SHELL"]).toBe("from-shell");
    expect(process.env["EMPTY_IN_SHELL"]).toBe("");
  });

  test("returns the file value even when the shell wins", () => {
    expect(loadEnvFiles(repositoryOptions)["SET_IN_SHELL"]).toBe("from-file");
  });

  test("replaces what the shell set when told to override", () => {
    loadEnvFiles({ ...repositoryOptions, override: true });

    expect(process.env["SET_IN_SHELL"]).toBe("from-file");
  });
});
