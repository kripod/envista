# envista

Cascading `.env` loader built on Node's own parser. Zero dependencies.

```sh
pnpm add envista
```

```js
import { loadEnvFiles } from "envista";

loadEnvFiles();
```

## Why

Node 22.21 and 24.10 made `util.parseEnv` stable, so parsing a `.env` file no
longer needs a library, and `process.loadEnvFile` already copies one file into
`process.env`. What Node does not do is decide _which_ files to read. envista
adds only that:

- **Cascades by mode**, in Vite's order: `.env`, `.env.local`, `.env.<mode>`,
  `.env.<mode>.local`
- **Searches parent directories**, so a package in a monorepo reads its own
  `.env` and falls back to the one at the repository root
- **No dependencies**, and no bundled parser to drift from the runtime's

## Precedence

Highest to lowest:

1. Variables already in `process.env`, such as shell exports
2. Files in the nearest directory
3. Files in each directory above it, nearest first

Within one directory, `.env.<mode>.local` outranks `.env.<mode>`, which
outranks `.env.local`, which outranks `.env`.

A whole directory outranks the one that contains it. A package's own `.env`
governs, and the repository root fills in only what that file leaves out.

To let files win over the current environment, pass `override: true`.

## API

### `loadEnvFiles(options?)`

Reads the files that apply into `process.env`, the way `process.loadEnvFile`
does for a single file. Call it once, before anything reads a variable.
Returns every variable the files held, including ones `process.env` kept.

```js
import { loadEnvFiles } from "envista";

loadEnvFiles({ mode: "production" });
```

### `readEnvFiles(options?)`

Same, but leaves `process.env` alone.

### `resolveEnvFiles(options?)`

Returns the absolute paths that apply, lowest precedence first, without reading
them. Use it to show a user which files a directory resolves to.

### Options

| Option     | Default                | Description                                                                                                                            |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`      | `process.cwd()`        | Directory to start the search from.                                                                                                    |
| `mode`     | `process.env.NODE_ENV` | Selects the `.env.<mode>` files. Without one, only `.env` and `.env.local` are read.                                                   |
| `stopAt`   | file system root       | Directory where the search stops, inclusive. Set it to a repository root to keep a stray `.env` in a home directory out of the result. |
| `override` | `false`                | `loadEnvFiles` only. Whether files may replace variables that are already set.                                                         |

## Format

envista parses whatever `util.parseEnv` parses, which is close to `dotenv` but
not identical. `src/parse.test.ts` records every case, and every divergence
from `dotenv`, from Node, and from the POSIX-shell
[dotenv-spec](https://github.com/php-xdg/dotenv-spec) carries a note saying
why.

A file written on Windows reads like any other. CRLF endings stay out of the
value, and a byte order mark stays out of the first key, where Node would
leave it.

Two inherited limits are worth knowing:

- `\r` stays literal inside double quotes, while `dotenv` expands it
- `A="he\"llo"` ends the value at the escaped quote. Use single quotes to keep
  a double quote in a value

envista does not expand `${VAR}` references. Values arrive as written.

## Requirements

Node `^22.21.0 || >=24.10.0`, the releases where
[`util.parseEnv`](https://nodejs.org/api/util.html#utilparseenvcontent) stopped
being experimental.

## Credit

The cascade order and the named-pipe handling come from
[Vite's `env.ts`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/env.ts),
which is MIT licensed. envista adds the parent-directory search and drops the
last dependency by not expanding variable references.

## License

[MIT](./LICENSE)
