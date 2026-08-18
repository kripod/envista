# Contributing

Thanks for helping out. This is a small package, so the bar is about keeping it
small.

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

Parsing behavior goes in the table at the top of `src/parse.test.ts`, one entry
per case. Set `source` to whoever you are quoting, and when envista reads the
case differently, write a `divergence` saying why. Every behavior is asserted
once, so read the table before adding a row.

Everything else goes in `src/index.test.ts`: which files a directory resolves
to, in what order, and what ends up in `process.env`. Each case writes real
`.env` files into a fresh temp directory and deletes it afterwards. Write yours
the same way. A committed fixture would have to be named `.env`, and
`.gitignore` skips that name on purpose.

## Scope

envista resolves and reads `.env` files. It does not:

- Expand `${VAR}` references, which would mean shipping a second parser
- Validate or coerce values, which schema libraries already do well
- Bundle its own `.env` parser, since the runtime has one

A pull request adding any of those gets a friendly no. One that fixes a
divergence from `util.parseEnv`, or covers a case the table misses, is welcome.

## Commit messages

The title is the whole message, as in `feat: search parent directories`. No
prose body. Pull requests land as squash commits, so your branch's commits do
not matter.

## Releasing

Maintainers only. Bump the version, tag it `vX.Y.Z`, and push the tag. The
release workflow checks the tag against `package.json`, then stages the build
through npm trusted publishing, which attaches a provenance attestation.

Staging means the version is not live yet. It waits for a maintainer, so review
it and let it out:

```sh
npm stage list envista
npm stage view <stage-id>
npm stage approve <stage-id>
```

Approving asks for 2FA, which is the point: the credential CI holds cannot put
a version in front of users on its own. `npm stage reject <stage-id>` drops it
instead.
