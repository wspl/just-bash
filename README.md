# just-bash monorepo

This repository hosts the [`just-bash`](./packages/just-bash) package and its examples.

## Packages

| Package | Path | Description |
| --- | --- | --- |
| [`just-bash`](./packages/just-bash) | `packages/just-bash` | A simulated bash environment with virtual filesystem |

See the package's own [README](./packages/just-bash/README.md) for usage documentation.

## Layout

```
packages/         publishable npm packages
examples/         example consumers (bash-agent, cjs-consumer, website)
.github/          CI workflows
```

## Working in the repo

```bash
bun install               # install all workspace deps
bun run build             # build all packages
bun run test:run          # run unit + comparison tests
bun run test:dist         # smoke-test the bundled output
bun run lint              # biome + per-package banned-pattern checks
bun run typecheck         # tsc across all packages
```

Per-package commands run via `bun --filter <name> <script>` — e.g.
`bun --filter @demicodes/just-bash test:wasm`.
