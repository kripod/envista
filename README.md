# envista

Cascading `.env` loader built on Node's own parser. Zero dependencies.

```sh
pnpm add envista
```

```js
import { loadEnvFiles } from "envista";

loadEnvFiles();
```

## Why this exists

Node already parses `.env` files:
[`util.parseEnv`](https://nodejs.org/api/util.html#utilparseenvcontent) went
stable in 22.21 and 24.10, and `process.loadEnvFile` copies one file into
`process.env`. What it leaves to you is picking _which_ files to read. envista
adds only that:

- **Cascades by mode**, in Vite's order: `.env`, `.env.local`, `.env.<mode>`,
  `.env.<mode>.local`
- **Searches upward**, so a package in a monorepo reads its own `.env` and
  falls back to the repository root for the rest
- **No dependencies**, and no bundled parser to drift from the runtime's

## Precedence

When two files declare the same key, highest precedence first:

1. Whatever is already in `process.env`. A shell export outranks every file
2. Files in the nearest directory
3. Files in each directory above it, nearest first

Within one directory: `.env.<mode>.local`, then `.env.<mode>`, then
`.env.local`, then `.env`.

The directory rule outranks the file rule, so a package's plain `.env` still
wins over the root's `.env.<mode>.local`. The nearest file decides, and the root
fills the gaps.

Want files to override what your shell set? Pass `override: true`.

## API

### `loadEnvFiles(options?)`

Reads every file that applies into `process.env`, the way `process.loadEnvFile`
does for one file. Call it once, before anything reads a variable.

```js
loadEnvFiles({ mode: "production" });
```

Returns everything the files held, including values `process.env` kept.

### `readEnvFiles(options?)`

The same read, with `process.env` left alone. Use it when you want the
variables as data, not a side effect.

### `resolveEnvFiles(options?)`

Returns the absolute paths that apply, lowest precedence first, without
reading them. Good for showing what a directory resolves to.

### Options

| Option     | Default                | What it does                                                                                           |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `cwd`      | `process.cwd()`        | Where the upward search starts.                                                                        |
| `mode`     | `process.env.NODE_ENV` | Picks the `.env.<mode>` files. Without a mode, only `.env` and `.env.local` are read.                  |
| `stopAt`   | file system root       | Where the search stops, inclusive. Point it at your repository root to keep a stray `.env` in `~` out. |
| `override` | `false`                | `loadEnvFiles` only. Lets files replace variables already set.                                         |

## Format

envista parses what `util.parseEnv` parses, which is close to `dotenv` but not
identical. `src/parse.test.ts` pins down every case, and every disagreement
with `dotenv`, Node, or the POSIX-shell
[dotenv-spec](https://github.com/php-xdg/dotenv-spec) carries a note saying why.

Files written on Windows are fine. CRLF endings stay out of your values, and a
byte order mark stays out of your first key, where Node would leave it and hand
you a name you cannot type.

Two quirks bite:

- `\r` stays literal inside double quotes. `dotenv` expands it, Node does not
- `A="he\"llo"` ends the value at the escaped quote and drops the rest of the
  line. Single quote it instead: `A='he"llo'`

envista does not expand `${VAR}` references. Values arrive as written, since
expansion means a second parser, the one thing this package exists to avoid.

## Requirements

Node `^22.21.0 || >=24.10.0`, the releases where `util.parseEnv` stopped being
experimental.

## Credit

The cascade order and the named-pipe handling come from
[Vite's `env.ts`](https://github.com/vitejs/vite/blob/da727337b13ac6144e523eb06852b2a52c377f22/packages/vite/src/node/env.ts),
MIT licensed. envista adds the upward search, and drops the last dependency by
leaving variable references alone.

## License

[MIT](./LICENSE)
