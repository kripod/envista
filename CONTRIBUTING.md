# Contributing

Thanks for helping out. This is a small package, so the bar is mostly about
keeping it small.

## Getting started

You need Node `^22.21.0 || >=24.10.0` and [pnpm](https://pnpm.io). If you use
[nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm),
`.nvmrc` picks the version for you.

```sh
pnpm install
pnpm test
```

## Before you open a pull request

Run all four. CI runs the same commands, so a failure here is a failure there.

```sh
pnpm run typecheck
pnpm test --run
pnpm run lint
pnpm run format
```

## Adding a test

Parsing behavior belongs in the table at the top of `src/parse.test.ts`, as one
entry. Set `source` to where the case comes from, and when envista disagrees
with that source, write a `divergence` explaining why. A test asserts the same
behavior once, so check the table before adding a case.

File resolution belongs in `src/files.test.ts`, and anything that touches
`process.env` belongs in `src/load.test.ts`.

## Scope

envista resolves and reads `.env` files. It does not:

- Expand `${VAR}` references, which would mean shipping a second parser
- Validate or coerce values, which schema libraries already do well
- Bundle its own `.env` parser, since the runtime has one

A pull request adding any of those will get a friendly no. One that fixes a
divergence from `util.parseEnv`, or covers a case the table misses, is welcome.

## Commit messages

The title is the whole message, as in `feat: search parent directories`. Pull
requests land as squash commits, so the commits on your branch do not matter.

## Releasing

Maintainers only. Bump the version, tag it `vX.Y.Z`, and push the tag. The
release workflow verifies the tag against `package.json` and publishes through
npm trusted publishing, which attaches a provenance attestation.
