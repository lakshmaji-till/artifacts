# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
bun install
```

## Local Development

```bash
bun run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
bun run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Pushes to `main` that touch `website/**` are built and deployed to GitHub Pages automatically by `.github/workflows/docs.yml`.

## Downloads page query parameters

The per-app downloads page (`/downloads/pos`, `/downloads/orbit`) reads two optional query parameters. Both are safe to drop — the page falls back to sensible defaults (Production, newest release) when they're absent or invalid.

- **`?environment=`** — for apps with multiple build environments (currently POS only), selects which environment's installer to show instead of the default (Production). There's no filter UI for this anymore; it's link-only. Accepts either a friendly alias or the raw internal value:

  | Alias        | Internal value |
  | ------------ | -------------- |
  | `production` | `prod-green`   |
  | `preprod`    | `prod-blue`    |
  | `qa`         | `test-in`      |

  Example: `/downloads/pos?environment=preprod`. See `resolveEnvParam` in `src/lib/releases.ts`.

- **`?b=`** — an opaque token produced by the page's share button, encoding a specific version + environment so a shared link opens scrolled to and highlighting that exact build. Not meant to be hand-written. See `encodeBuildId`/`decodeBuildId` in `src/components/DownloadsPage.tsx`.
