// The GitHub releases feed, read in the browser.
//
// Nothing here — and nothing that renders it — writes a version down. The
// site is deployed by docs.yml, which only fires on pushes touching
// website/, so anything resolved at build time would be stale the moment a
// release ships. The API call happens on page load instead, at the same
// unauthenticated 60-per-hour budget any anonymous caller gets.

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
};

// build.yml names Windows installers POS-<env>-<version>-<buildTimestamp>-installer.exe,
// e.g. POS-test-in-7.41.22-1787738273-installer.exe. Everything else a release
// carries (POS.exe, pos-manifest.json) is for the in-app updater, not someone
// installing fresh, and is ignored here.
const INSTALLER_NAME = /^POS-(.+)-(\d+\.\d+\.\d+)-\d+-installer\.exe$/;

/** Parses an asset name into its environment and version, or null if it isn't an installer. */
export function parseInstaller(
  name: string,
): {env: string; version: string} | null {
  const match = INSTALLER_NAME.exec(name);
  if (!match) return null;
  return {env: match[1], version: match[2]};
}

/**
 * The environments a build can ship to, in the order they appear as filter
 * pills. The label is what a person picking an installer sees; the value is
 * the `<env>` segment build.yml bakes into the asset name.
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

/** The Windows installer asset for `env` in `release`, if that release shipped one. */
export function installerFor(release: Release, env: string): Asset | undefined {
  return release.assets.find((a) => parseInstaller(a.name)?.env === env);
}

/** The version a release shipped, read off its installer asset rather than its tag. */
export function releaseVersion(release: Release): string | null {
  for (const asset of release.assets) {
    const parsed = parseInstaller(asset.name);
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
export function latestInstallers(releases: Release[]): Installer[] {
  const byEnv = new Map<string, Installer>();
  for (const release of releases) {
    for (const asset of release.assets) {
      const parsed = parseInstaller(asset.name);
      if (!parsed || byEnv.has(parsed.env)) continue;
      byEnv.set(parsed.env, {env: parsed.env, version: parsed.version, asset});
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
 * fetchReleases returns the published releases, newest first by publish time.
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
export async function fetchReleases(limit = 30): Promise<Release[]> {
  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=${limit}`,
    {headers: {Accept: 'application/vnd.github+json'}},
  );
  if (!resp.ok) {
    throw new Error(`GitHub returned ${resp.status}`);
  }
  const body: GhRelease[] = await resp.json();
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

/** "36.3 MB" — release artifacts are always megabytes, so one unit is enough. */
export function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
