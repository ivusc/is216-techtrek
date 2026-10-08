# IS216 TechTrek

A pnpm **monorepo** holding both halves of the app:

| Package            | Path      | Stack                               |
| ------------------ | --------- | ----------------------------------- |
| `@techtrek/client` | `client/` | Vue 3, Vite, Pinia, Vue Router      |
| `@techtrek/server` | `server/` | Express 5, Mongoose (MongoDB Atlas) |

`pnpm-workspace.yaml` is what makes this a monorepo: one lockfile, one
`node_modules` store, and one place to run a command across both packages.

## Commands

Run all of these from the repo root.

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Client and API together, both watching for changes |
| `pnpm dev:client`   | Client only                                        |
| `pnpm dev:server`   | API only                                           |
| `pnpm build`        | Production build of every package that has one     |
| `pnpm test`         | Unit tests across every package                    |
| `pnpm test:e2e`     | Playwright end-to-end tests                        |
| `pnpm lint`         | ESLint + oxlint, autofixing what it can            |
| `pnpm format`       | Prettier across the whole repo                     |
| `pnpm format:check` | Prettier in check-only mode (use this in CI)       |
