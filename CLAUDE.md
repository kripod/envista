# envista

Cascading `.env` loader over Node's `util.parseEnv`. See the README for what it
does. `src` holds the whole implementation and its tests.

## Workflow

- Run `pnpm typecheck`, `pnpm test`, `pnpm lint` and `pnpm format` before
  calling a change done
- A commit title is the whole message, as in `feat: search parent directories`.
  No prose body. PRs squash, so a branch's own commits do not matter
- Releases go out by pushing a `vX.Y.Z` tag matching `package.json`

## Code

- IMPORTANT: the runtime owns the parser. `parse` may normalize its input and
  its output shape, but it must never reimplement `.env` syntax. A second parser
  is the dependency this package exists to avoid
- Precedence is the whole product, so anything that changes it needs a test and
  a line in the README's Precedence section
- Types read top-down: the aggregate first, then what it is made of, and a
  caller above the helper it calls
- Reading the environment is startup work, so the file APIs stay synchronous.
  An async twin would double the surface for no gain

## Tests

- A case earns its place by covering a divergence that would corrupt data, not
  by walking a path another test already walks
- Parsing behavior lives only in the table at the top of `parse.test.ts`, one
  entry per case. `source` says where the case comes from, and `divergence` says
  why we disagree with it, which the type requires for every source but `dotenv`
- `index.test.ts` covers the public API against one temp tree, rebuilt per case
- A title carries the behavior and a named variable carries the rest, so a test
  body needs no comment
- Tests write into a fresh `mkdtemp` directory rather than a committed fixture,
  since a fixture named `.env` fights both `.gitignore` and the editor. Each one
  removes its tree afterwards, and anything touching `process.env` restores it

## Voice

- Write like a lazy engineer who is not trying to be funny: say the thing, stop
- No semicolons, em dashes, or en dashes. Nobody reaches for them at a
  keyboard, so they read as machine output. A period splits the sentence, a
  comma joins the clause, and a colon introduces the list
- Settle anything left open with the Google developer documentation style guide,
  https://developers.google.com/style. US English, so normalize over normalise,
  unless a web standard spells it otherwise
- Prefer the format's own words over invented synonyms: variable, key, value,
  mode, cascade, precedence, override, expansion
- Comments carry behavior and surprises, names carry the rest. Bullets beat
  paragraphs in docs, but comments stay prose
- No trailing punctuation on a comment. JSDoc is the exception, since it can end
  up published
