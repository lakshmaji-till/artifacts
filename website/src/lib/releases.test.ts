import {expect, test} from 'bun:test';

import {
  DEFAULT_ENV,
  ENVIRONMENTS,
  envLabel,
  fetchReleases,
  installerFor,
  latestInstallers,
  parseInstaller,
  releaseVersion,
  type Release,
} from './releases';

test('parseInstaller extracts env and version from an installer name', () => {
  expect(
    parseInstaller('POS-test-in-7.41.22-1787738273-installer.exe'),
  ).toEqual({env: 'test-in', version: '7.41.22'});
  expect(
    parseInstaller('POS-prod-7.42.0-1787999999-installer.exe'),
  ).toEqual({env: 'prod', version: '7.42.0'});
});

test('parseInstaller ignores non-installer assets', () => {
  expect(parseInstaller('POS.exe')).toBeNull();
  expect(parseInstaller('pos-manifest.json')).toBeNull();
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

  const installers = latestInstallers(releases);
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

  const installers = latestInstallers(releases);
  expect(installers.map((i) => i.env)).toEqual([
    'prod-green',
    'prod-blue',
    'test-in',
  ]);
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

  expect(installerFor(release, 'test-in')?.name).toBe(
    'POS-test-in-7.41.22-1787738273-installer.exe',
  );
  expect(installerFor(release, 'prod-green')).toBeUndefined();
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
  expect(releaseVersion(release)).toBe('7.41.22');
  expect(releaseVersion({tag: 'empty', published: '', assets: []})).toBeNull();
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
