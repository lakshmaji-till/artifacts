// The GitHub releases feed, read in the browser.
//
// Nothing here — and nothing that renders it — writes a version down. The
// site is deployed by docs.yml, which only fires on pushes touching
// website/, so anything resolved at build time would be stale the moment a
// release ships. The API call happens on page load instead, at the same
// unauthenticated 60-per-hour budget any anonymous caller gets.

import appsData from './apps.json';

export const REPO = 'lakshmaji-till/artifacts';
export const RELEASES_URL = `https://github.com/${REPO}/releases`;
export const LATEST_URL = `${RELEASES_URL}/latest`;

export type Asset = {
  name: string;
  url: string;
  size: number;
};

export type Release = {
  tag: string;
  published: string;
  assets: Asset[];
};

/** One environment's installer: the version it's on and the asset to fetch it from. */
export type Installer = {
  env: string;
  version: string;
  asset: Asset;
  /** When the release workflow built this asset, if its name encodes one. */
  builtAt?: Date;
};

/**
 * One publishable app in this repo's release feed. `tagPrefix` decides which
 * release tags belong to it; `assetPattern` decides which asset in a matching
 * release is the installer to offer, compiled into a RegExp with named
 * capture groups — `version` (required), and optionally `env` and
 * `timestamp` for apps that have them.
 */
export type AppConfig = {
  id: string;
  label: string;
  /** Short form for tight spaces, e.g. a "Download {shortLabel}" button. */
  shortLabel: string;
  tagPrefix: string;
  assetPattern: string;
  hasEnvironments: boolean;
};

export const APPS: AppConfig[] = appsData.apps;

/** The releases belonging to `app`, going by tag prefix. */
export function releasesForApp(releases: Release[], app: AppConfig): Release[] {
  return releases.filter((r) => r.tag.startsWith(app.tagPrefix));
}

/**
 * The version to display for a release: read off its installer asset where
 * possible, falling back to its tag with `app.tagPrefix` stripped — so a
 * release that shipped no matching installer still reads as a bare version
 * number instead of the raw, prefix-and-letters tag.
 */
export function displayVersion(app: AppConfig, release: Release): string {
  return (
    releaseVersion(app, release) ??
    (release.tag.startsWith(app.tagPrefix)
      ? release.tag.slice(app.tagPrefix.length)
      : release.tag)
  );
}

/** Parses an asset name into its environment, version and build time, or null if it isn't an installer. */
export function parseInstaller(
  app: AppConfig,
  name: string,
): {env: string; version: string; builtAt?: Date} | null {
  const match = new RegExp(app.assetPattern).exec(name);
  if (!match?.groups?.version) return null;
  const {env, version, timestamp} = match.groups;
  return {
    env: env ?? '',
    version,
    builtAt: timestamp ? new Date(Number(timestamp) * 1000) : undefined,
  };
}

/**
 * The environments an env-scoped app (`hasEnvironments: true`) can ship to,
 * in the order they appear as filter pills. The label is what a person
 * picking an installer sees; the value is the `<env>` segment a release
 * workflow bakes into the asset name.
 */
export const ENVIRONMENTS: {label: string; value: string}[] = [
  {label: 'Production', value: 'prod-green'},
  {label: 'Pre-prod', value: 'prod-blue'},
  {label: 'QA', value: 'test-in'},
];

/** Production first — that's the build most people asking for "the download" want. */
export const DEFAULT_ENV = ENVIRONMENTS[0].value;

export function envLabel(env: string): string {
  return ENVIRONMENTS.find((e) => e.value === env)?.label ?? env;
}

/**
 * The Windows installer asset for `app` in `release`. For apps without
 * environments, `env` is ignored — there's only ever one installer to find.
 */
export function installerFor(
  app: AppConfig,
  release: Release,
  env?: string,
): Asset | undefined {
  return release.assets.find((a) => {
    const parsed = parseInstaller(app, a.name);
    if (!parsed) return false;
    return app.hasEnvironments ? parsed.env === env : true;
  });
}

/** The version a release shipped, read off its installer asset rather than its tag. */
export function releaseVersion(app: AppConfig, release: Release): string | null {
  for (const asset of release.assets) {
    const parsed = parseInstaller(app, asset.name);
    if (parsed) return parsed.version;
  }
  return null;
}

/**
 * The latest installer for each environment a release history carries, newest
 * release first. An environment is only as fresh as its most recent release —
 * an env that stops shipping simply stops appearing here.
 *
 * Sorted Production-first (the `ENVIRONMENTS` order), so the homepage's
 * primary button and the installer-button row agree on which environment
 * leads. Environments outside that list — none expected, but the parser
 * doesn't reject them — sort after the known ones, alphabetically.
 */
export function latestInstallers(app: AppConfig, releases: Release[]): Installer[] {
  const byEnv = new Map<string, Installer>();
  for (const release of releases) {
    for (const asset of release.assets) {
      const parsed = parseInstaller(app, asset.name);
      if (!parsed || byEnv.has(parsed.env)) continue;
      byEnv.set(parsed.env, {
        env: parsed.env,
        version: parsed.version,
        asset,
        builtAt: parsed.builtAt,
      });
    }
  }
  const priority = (env: string) => {
    const index = ENVIRONMENTS.findIndex((e) => e.value === env);
    return index === -1 ? ENVIRONMENTS.length : index;
  };
  return [...byEnv.values()].sort(
    (a, b) => priority(a.env) - priority(b.env) || a.env.localeCompare(b.env),
  );
}

type GhAsset = {name: string; browser_download_url: string; size: number};
type GhRelease = {
  tag_name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: GhAsset[];
};

/**
 * Maps a raw GitHub API response body to the published releases, newest
 * first by publish time.
 *
 * The GitHub API's own ordering is by `created_at`, which this repo's
 * releases all share a single value for (they were bulk-created, then
 * published individually over time) — sorting by `created_at` would return
 * releases in a near-arbitrary order. `published_at` is what actually
 * reflects "most recently shipped," and it's the same signal GitHub itself
 * uses to pick which release gets the "Latest" badge.
 *
 * Drafts and prereleases are dropped — the download page should never offer
 * a build nobody's meant to install yet.
 */
function toReleases(body: GhRelease[]): Release[] {
  return body
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({
      tag: r.tag_name,
      published: r.published_at,
      assets: r.assets.map((a) => ({
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
      })),
    }))
    .sort((a, b) => b.published.localeCompare(a.published));
}

export async function fetchReleases(limit = 30): Promise<Release[]> {
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=${limit}`,
    {headers: {Accept: 'application/vnd.github+json'}},
  );
  if (!resp.ok) {
    throw new Error(`GitHub returned ${resp.status}`);
  }
  return toReleases(await resp.json());
}

export type ReleasesPage = {releases: Release[]; hasMore: boolean};

/** True if a GitHub `Link` response header advertises a `rel="next"` page. */
function hasNextPage(link: string | null): boolean {
  return !!link && /<[^>]*>;\s*rel="next"/.test(link);
}

/**
 * One raw page of the GitHub releases feed — not filtered to any app, since
 * `pos` and `orbit` releases are interleaved in the same feed and GitHub has
 * no per-app filter. Callers paging through a specific app's releases must
 * keep pulling pages themselves (via `releasesForApp`) until they have
 * enough matches or `hasMore` is false.
 */
export async function fetchReleasesPage(
  page: number,
  perPage = 10,
): Promise<ReleasesPage> {
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=${perPage}&page=${page}`,
    {headers: {Accept: 'application/vnd.github+json'}},
  );
  if (!resp.ok) {
    throw new Error(`GitHub returned ${resp.status}`);
  }
  const releases = toReleases(await resp.json());
  return {releases, hasMore: hasNextPage(resp.headers.get('Link'))};
}

/** "36.3 MB" — release artifacts are always megabytes, so one unit is enough. */
export function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "9 Sep 2026, 3:15 pm" — the build timestamp baked into an installer's name, made readable. */
export function formatBuiltAt(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
