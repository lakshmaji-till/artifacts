import {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import Loading from '@site/src/components/Loading';
import {
  DEFAULT_ENV,
  ENVIRONMENTS,
  envLabel,
  fetchReleases,
  formatSize,
  installerFor,
  releaseVersion,
  RELEASES_URL,
  type Release,
} from '@site/src/lib/releases';
import styles from './downloads.module.css';

/** Share glyph: three connected nodes, matching common OS share icons. */
function ShareIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  );
}

/** Checkmark shown briefly in place of {@link ShareIcon} after a copy. */
function CheckIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Packs a version + channel into one opaque, URL-safe `?b=` token. */
function encodeBuildId(version: string, channel: string): string {
  return btoa(`${version}|${channel}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Reverses {@link encodeBuildId}, or returns null if `id` isn't one of ours. */
function decodeBuildId(id: string | null): {v: string; channel: string} | null {
  if (!id) return null;
  try {
    const base64 = id.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const [v, channel] = atob(padded).split('|');
    return v && channel ? {v, channel} : null;
  } catch {
    return null;
  }
}

export default function Downloads(): ReactNode {
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  // An index rather than a tag: the sidebar re-renders in fetch order, and an
  // index survives that fine since the list itself never reorders in place.
  const [selected, setSelected] = useState(0);
  const [env, setEnv] = useState(DEFAULT_ENV);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetchReleases()
      .then((rs) => live && setReleases(rs))
      .catch(() => live && setFailed(true))
      .finally(() => live && setPending(false));
    return () => {
      live = false;
    };
  }, []);

  // Pick up a shared link's ?b=<id> once the release list is in, so the page
  // lands directly on the build it points at instead of the default.
  useEffect(() => {
    if (!releases) return;
    const build = decodeBuildId(
      new URLSearchParams(window.location.search).get('b'),
    );
    if (!build) return;
    const index = releases.findIndex(
      (r) => releaseVersion(r) === build.v || r.tag === build.v,
    );
    if (index !== -1) setSelected(index);
    if (ENVIRONMENTS.some((e) => e.value === build.channel)) {
      setEnv(build.channel);
    }
    // Only meant to run once, when the release list first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releases]);

  const release = releases?.[selected];
  const asset = release && installerFor(release, env);
  const version = release && (releaseVersion(release) ?? release.tag);

  // Keep the address bar in sync with the current selection, so it's always
  // what "Copy link" would produce — and reload-safe without extra clicks.
  useEffect(() => {
    if (!version) return;
    const url = new URL(window.location.href);
    url.searchParams.set('b', encodeBuildId(version, env));
    window.history.replaceState(null, '', url);
  }, [version, env]);

  function copyLink() {
    if (!version) return;
    const url = new URL(window.location.href);
    url.searchParams.set('b', encodeBuildId(version, env));
    const link = url.toString();
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => window.prompt('Copy this link:', link));
  }

  return (
    <Layout
      title="Download"
      description="Every POS Desktop release, for Production, Pre-prod and QA.">
      <div className={clsx('container', styles.page)}>
        <Heading as="h1">Download</Heading>
        <p>Every release, newest first. Windows installer only.</p>

        {pending && <Loading label="Loading releases…" />}

        {failed && (
          <p>
            The release list could not be loaded — GitHub may be unreachable or
            rate-limiting this network. Everything is on the{' '}
            <a href={RELEASES_URL}>releases page</a>.
          </p>
        )}

        {releases && (
          <div className={styles.layout}>
            <ul className={styles.versions}>
              {releases.map((r, i) => (
                <li key={r.tag}>
                  <button
                    type="button"
                    className={clsx(i === selected && styles.selected)}
                    onClick={() => setSelected(i)}>
                    v{releaseVersion(r) ?? r.tag}
                    {i === 0 && <span className={styles.latest}>latest</span>}
                  </button>
                </li>
              ))}
            </ul>

            <div>
              <div className={styles.filters}>
                {ENVIRONMENTS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    className={clsx(e.value === env && styles.selected)}
                    onClick={() => setEnv(e.value)}>
                    {e.label}
                  </button>
                ))}
              </div>

              {asset ? (
                <table className={styles.assets}>
                  <tbody>
                    <tr>
                      <td>
                        <a href={asset.url}>{asset.name}</a>
                      </td>
                      <td className={styles.meta}>{formatSize(asset.size)}</td>
                      <td className={styles.shareCell}>
                        <button
                          type="button"
                          className={styles.shareButton}
                          aria-label={
                            copied ? 'Link copied' : 'Copy link to this build'
                          }
                          title={
                            copied ? 'Link copied' : 'Copy link to this build'
                          }
                          onClick={copyLink}>
                          {copied ? <CheckIcon /> : <ShareIcon />}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p>
                  Nothing for {envLabel(env)} in v
                  {(release && releaseVersion(release)) ?? release?.tag}.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
