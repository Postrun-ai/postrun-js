# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

Run `pnpm changeset` to record a version bump for `@postrun/js` / `@postrun/react`,
then `pnpm release` (CI) to build and publish to npm. The two packages version in
lockstep (see `fixed` in `config.json`).
