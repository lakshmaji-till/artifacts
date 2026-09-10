import {expect, test} from 'bun:test';

import {
  DEFAULT_ENV,
  displayVersion,
  ENVIRONMENTS,
  envLabel,
  fetchReleases,
  fetchReleasesPage,
  formatBuiltAt,
  installerFor,
  latestInstallers,
  parseInstaller,
  releasesForApp,
  releaseVersion,
  type AppConfig,
  type Release,
} from './releases';

const POS: AppConfig = {
  id: 'pos',
  label: 'POS Desktop',
  shortLabel: 'POS',
  tagPrefix: 'oolio-pos-app-v',
  assetPattern:
    '^POS-(?<env>.+)-(?<version>\\d+\\.\\d+\\.\\d+)-(?<timestamp>\\d+)-installer\\.exe$',
  hasEnvironments: true,
};

const ORBIT: AppConfig = {
  id: 'orbit',
  label: 'Orbit',
  shortLabel: 'Orbit',
  tagPrefix: 'oolio-orbit-',
  assetPattern:
    '^Orbit-Windows-Setup-(?<version>\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)\\.exe$',
  hasEnvironments: false,
};

test('parseInstaller extracts env and version from an installer name', () => {
  expect(
    parseInstaller(POS, 'POS-test-in-7.41.22-1787738273-installer.exe'),
  ).toMatchObject({env: 'test-in', version: '7.41.22'});
  expect(
    parseInstaller(POS, 'POS-prod-7.42.0-1787999999-installer.exe'),
  ).toMatchObject({env: 'prod', version: '7.42.0'});
});

test('parseInstaller ignores non-installer assets', () => {
  expect(parseInstaller(POS, 'POS.exe')).toBeNull();
  expect(parseInstaller(POS, 'pos-manifest.json')).toBeNull();
});

test('parseInstaller reads a version-only match for apps without environments', () => {
  expect(parseInstaller(ORBIT, 'Orbit-Windows-Setup-0.40.2.exe')).toEqual({
    env: '',
    version: '0.40.2',
    builtAt: undefined,
  });
  expect(
    parseInstaller(ORBIT, 'Orbit-Windows-Setup-0.40.0-alpha.33.exe'),
  ).toEqual({env: '', version: '0.40.0-alpha.33', builtAt: undefined});
  expect(parseInstaller(ORBIT, 'Orbit-Windows-0.40.2.zip')).toBeNull();
  expect(parseInstaller(ORBIT, 'Orbit-0.40.2.dmg')).toBeNull();
});

test('parseInstaller reads the build timestamp for apps that encode one', () => {
  const parsed = parseInstaller(
    POS,
    'POS-test-in-7.41.22-1787738273-installer.exe',
  );
  expect(parsed?.builtAt).toEqual(new Date(1787738273 * 1000));
});

test('parseInstaller leaves builtAt undefined when the pattern has no timestamp group', () => {
  const parsed = parseInstaller(ORBIT, 'Orbit-Windows-Setup-0.40.2.exe');
  expect(parsed?.builtAt).toBeUndefined();
});

test('formatBuiltAt renders a build timestamp as a readable date and time', () => {
  const formatted = formatBuiltAt(new Date(1787738273 * 1000));
  // Locale-dependent, so assert on shape rather than an exact string.
  expect(formatted).toMatch(/2026/);
});

test('releasesForApp filters releases by tag prefix', () => {
  const releases: Release[] = [
    {tag: 'oolio-pos-app-v7.41.22', published: '', assets: []},
    {tag: 'oolio-orbit-0.40.2', published: '', assets: []},
  ];
  expect(releasesForApp(releases, POS).map((r) => r.tag)).toEqual([
    'oolio-pos-app-v7.41.22',
  ]);
  expect(releasesForApp(releases, ORBIT).map((r) => r.tag)).toEqual([
    'oolio-orbit-0.40.2',
  ]);
});

test('latestInstallers picks the newest release per environment', () => {
  const releases: Release[] = [
    {
      tag: 'oolio-pos-app-v7.41.22',
      published: '2026-08-26T10:11:51Z',
      assets: [
        {
          name: 'POS-test-in-7.41.22-1787738273-installer.exe',
          url: 'https://x/POS-test-in-7.41.22-1787738273-installer.exe',
          size: 1,
        },
        {name: 'POS.exe', url: 'https://x/POS.exe', size: 1},
        {name: 'pos-manifest.json', url: 'https://x/pos-manifest.json', size: 1},
      ],
    },
    {
      tag: 'oolio-pos-app-v7.41.21',
      published: '2026-08-26T09:36:13Z',
      assets: [
        {
          name: 'POS-test-in-7.41.21-1787736191-installer.exe',
          url: 'https://x/POS-test-in-7.41.21-1787736191-installer.exe',
          size: 1,
        },
      ],
    },
  ];

  const installers = latestInstallers(POS, releases);
  expect(installers).toHaveLength(1);
  expect(installers[0]).toMatchObject({env: 'test-in', version: '7.41.22'});
});

test('latestInstallers keeps each environment separate, Production first', () => {
  const releases: Release[] = [
    // Listed QA-first, deliberately out of ENVIRONMENTS order — the sort has
    // to fix that, not just pass it through.
    {
      tag: 'oolio-pos-app-v7.41.22',
      published: '2026-08-26T10:11:51Z',
      assets: [
        {
          name: 'POS-test-in-7.41.22-1787738273-installer.exe',
          url: 'https://x/test-in.exe',
          size: 1,
        },
      ],
    },
    {
      tag: 'oolio-pos-app-v7.42.0',
      published: '2026-08-27T00:00:00Z',
      assets: [
        {
          name: 'POS-prod-blue-7.42.0-1788000000-installer.exe',
          url: 'https://x/prod-blue.exe',
          size: 1,
        },
      ],
    },
    {
      tag: 'oolio-pos-app-v7.42.1',
      published: '2026-08-27T01:00:00Z',
      assets: [
        {
          name: 'POS-prod-green-7.42.1-1788000100-installer.exe',
          url: 'https://x/prod-green.exe',
          size: 1,
        },
      ],
    },
  ];

  const installers = latestInstallers(POS, releases);
  expect(installers.map((i) => i.env)).toEqual([
    'prod-green',
    'prod-blue',
    'test-in',
  ]);
});

test('latestInstallers returns a single entry for an app without environments', () => {
  const releases: Release[] = [
    {
      tag: 'oolio-orbit-0.40.2',
      published: '2026-08-26T10:11:51Z',
      assets: [
        {
          name: 'Orbit-Windows-Setup-0.40.2.exe',
          url: 'https://x/Orbit-Windows-Setup-0.40.2.exe',
          size: 1,
        },
        {name: 'Orbit-0.40.2.dmg', url: 'https://x/Orbit-0.40.2.dmg', size: 1},
      ],
    },
  ];

  const installers = latestInstallers(ORBIT, releases);
  expect(installers).toHaveLength(1);
  expect(installers[0]).toMatchObject({env: '', version: '0.40.2'});
});

test('envLabel maps known environments and falls back to the raw value', () => {
  expect(envLabel('prod-green')).toBe('Production');
  expect(envLabel('prod-blue')).toBe('Pre-prod');
  expect(envLabel('test-in')).toBe('QA');
  expect(envLabel('staging')).toBe('staging');
});

test('DEFAULT_ENV is Production', () => {
  expect(DEFAULT_ENV).toBe('prod-green');
  expect(ENVIRONMENTS[0]).toEqual({label: 'Production', value: 'prod-green'});
});

test('installerFor finds the asset for an environment, or nothing', () => {
  const release: Release = {
    tag: 'oolio-pos-app-v7.41.22',
    published: '2026-08-26T10:11:51Z',
    assets: [
      {
        name: 'POS-test-in-7.41.22-1787738273-installer.exe',
        url: 'https://x/test-in.exe',
        size: 1,
      },
    ],
  };

  expect(installerFor(POS, release, 'test-in')?.name).toBe(
    'POS-test-in-7.41.22-1787738273-installer.exe',
  );
  expect(installerFor(POS, release, 'prod-green')).toBeUndefined();
});

test('installerFor ignores env for apps without environments', () => {
  const release: Release = {
    tag: 'oolio-orbit-0.40.2',
    published: '2026-08-26T10:11:51Z',
    assets: [
      {
        name: 'Orbit-Windows-Setup-0.40.2.exe',
        url: 'https://x/Orbit-Windows-Setup-0.40.2.exe',
        size: 1,
      },
    ],
  };

  expect(installerFor(ORBIT, release)?.name).toBe(
    'Orbit-Windows-Setup-0.40.2.exe',
  );
});

test('releaseVersion reads the version off the installer asset', () => {
  const release: Release = {
    tag: 'oolio-pos-app-v7.41.22',
    published: '2026-08-26T10:11:51Z',
    assets: [
      {name: 'POS.exe', url: 'https://x/POS.exe', size: 1},
      {
        name: 'POS-test-in-7.41.22-1787738273-installer.exe',
        url: 'https://x/test-in.exe',
        size: 1,
      },
    ],
  };
  expect(releaseVersion(POS, release)).toBe('7.41.22');
  expect(
    releaseVersion(POS, {tag: 'empty', published: '', assets: []}),
  ).toBeNull();
});

test('displayVersion prefers the installer version over the tag', () => {
  const release: Release = {
    tag: 'oolio-pos-app-v7.41.22',
    published: '2026-08-26T10:11:51Z',
    assets: [
      {
        name: 'POS-test-in-7.41.22-1787738273-installer.exe',
        url: 'https://x/test-in.exe',
        size: 1,
      },
    ],
  };
  expect(displayVersion(POS, release)).toBe('7.41.22');
});

test('displayVersion falls back to the tag with the app prefix stripped, not the raw tag', () => {
  const release: Release = {
    tag: 'oolio-pos-app-v7.443.2',
    published: '2026-08-26T10:11:51Z',
    assets: [],
  };
  expect(displayVersion(POS, release)).toBe('7.443.2');
});

test('fetchReleases drops drafts and prereleases', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          tag_name: 'oolio-pos-app-v7.41.22',
          published_at: '2026-08-26T10:11:51Z',
          draft: false,
          prerelease: false,
          assets: [
            {
              name: 'POS-test-in-7.41.22-1787738273-installer.exe',
              browser_download_url: 'https://x/installer.exe',
              size: 38_100_000,
            },
          ],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.23-rc.1',
          published_at: '2026-08-27T00:00:00Z',
          draft: false,
          prerelease: true,
          assets: [],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.24-draft',
          published_at: '2026-08-27T01:00:00Z',
          draft: true,
          prerelease: false,
          assets: [],
        },
      ]),
    )) as typeof fetch;

  const [only, ...rest] = await fetchReleases();
  expect(rest).toHaveLength(0);
  expect(only.tag).toBe('oolio-pos-app-v7.41.22');
  expect(only.assets[0].name).toBe(
    'POS-test-in-7.41.22-1787738273-installer.exe',
  );
});

test('fetchReleases sorts by published_at, not API order or version number', async () => {
  // Mirrors what this repo's release history actually looks like: every
  // release shares one created_at (they were bulk-created), and publish
  // order doesn't track version order either — v7.41.25 published before
  // v7.41.23/24 despite the higher number. GitHub's own "Latest" badge goes
  // to whichever published most recently, so that's what this must return
  // first too.
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          tag_name: 'oolio-pos-app-v7.41.9',
          published_at: '2026-08-24T21:39:19Z',
          draft: false,
          prerelease: false,
          assets: [],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.25',
          published_at: '2026-08-26T19:05:34Z',
          draft: false,
          prerelease: false,
          assets: [],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.24',
          published_at: '2026-08-26T19:47:06Z',
          draft: false,
          prerelease: false,
          assets: [],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.23',
          published_at: '2026-08-26T19:24:08Z',
          draft: false,
          prerelease: false,
          assets: [],
        },
      ]),
    )) as typeof fetch;

  const releases = await fetchReleases();
  expect(releases.map((r) => r.tag)).toEqual([
    'oolio-pos-app-v7.41.24',
    'oolio-pos-app-v7.41.23',
    'oolio-pos-app-v7.41.25',
    'oolio-pos-app-v7.41.9',
  ]);
});

test('fetchReleasesPage requests the given page and per_page', async () => {
  let requestedUrl: string | undefined;
  globalThis.fetch = (async (url: string) => {
    requestedUrl = url;
    return new Response(JSON.stringify([]));
  }) as typeof fetch;

  await fetchReleasesPage(3, 10);
  expect(requestedUrl).toContain('per_page=10');
  expect(requestedUrl).toContain('page=3');
});

test('fetchReleasesPage reports hasMore from a Link rel="next" header', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([]), {
      headers: {
        Link: '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"',
      },
    })) as typeof fetch;

  const {hasMore} = await fetchReleasesPage(1);
  expect(hasMore).toBe(true);
});

test('fetchReleasesPage reports hasMore false on the last page', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([]), {
      headers: {
        Link: '<https://api.github.com/x?page=1>; rel="prev", <https://api.github.com/x?page=1>; rel="first"',
      },
    })) as typeof fetch;

  const {hasMore} = await fetchReleasesPage(2);
  expect(hasMore).toBe(false);
});

test('fetchReleasesPage reports hasMore false when no Link header is present', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify([]))) as typeof fetch;

  const {hasMore} = await fetchReleasesPage(1);
  expect(hasMore).toBe(false);
});

test('fetchReleasesPage filters and sorts releases like fetchReleases', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify([
        {
          tag_name: 'oolio-pos-app-v7.41.22',
          published_at: '2026-08-26T10:11:51Z',
          draft: false,
          prerelease: false,
          assets: [],
        },
        {
          tag_name: 'oolio-pos-app-v7.41.24-draft',
          published_at: '2026-08-27T01:00:00Z',
          draft: true,
          prerelease: false,
          assets: [],
        },
      ]),
    )) as typeof fetch;

  const {releases} = await fetchReleasesPage(1);
  expect(releases.map((r) => r.tag)).toEqual(['oolio-pos-app-v7.41.22']);
});

test('fetchReleasesPage throws on a non-ok response', async () => {
  globalThis.fetch = (async () =>
    new Response('', {status: 403})) as typeof fetch;

  await expect(fetchReleasesPage(1)).rejects.toThrow('GitHub returned 403');
});
