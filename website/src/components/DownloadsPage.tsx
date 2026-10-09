import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import Loading from '@site/src/components/Loading';
import {
  DEFAULT_ENV,
  displayVersion,
  ENVIRONMENTS,
  fetchReleasesPage,
  formatBuiltAt,
  formatSize,
  installerFor,
  parseInstaller,
  releasesForApp,
  releaseVersion,
  RELEASES_URL,
  resolveEnvParam,
  type AppConfig,
  type Asset,
  type Release,
} from '@site/src/lib/releases';
import styles from './DownloadsPage.module.css';

/**
 * Releases per GitHub raw-feed page. Small enough that a scroll through a
 * typical history costs single-digit requests against the unauthenticated
 * 60-per-hour budget, big enough that a page usually has at least one match
 * for either app (their releases are interleaved in one feed).
 */
const RAW_PAGE_SIZE = 10;

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

/** Download glyph: an arrow into a tray, for the per-version download button. */
function DownloadIcon(): ReactNode {
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
      <path d="M12 3v12" />
      <polyline points="7 10 12 15 17 10" />
      <path d="M4 19h16" />
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

/**
 * The download page for one app (POS, Orbit, ...). Every release, newest
 * first, each as one row with its own download button, build time, size and
 * share action — no separate "pick a version, then look elsewhere for its
 * asset" step. A global environment filter when `app.hasEnvironments` — pick
 * the environment once, then every row's download button follows it.
 */
export default function DownloadsPage({app}: {app: AppConfig}): ReactNode {
  // Releases matching this app, accumulated across raw GitHub pages —
  // pos/orbit releases are interleaved in one feed, so a raw page can
  // contribute zero, one, or many rows here.
  const [releases, setReleases] = useState<Release[]>([]);
  const [rawPage, setRawPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pending, setPending] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [env, setEnv] = useState(DEFAULT_ENV);
  // Which row's share button last copied a link, so only that one flips to a
  // checkmark rather than every row on the page.
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  // A shared link's build, highlighted once the matching row renders.
  const [highlightTag, setHighlightTag] = useState<string | null>(null);
  // A shared link's ?b=<id> target, kept around until its row has loaded (or
  // the feed runs out) so pagination can be driven to find it automatically.
  const [pendingBuild, setPendingBuild] = useState<{v: string; channel: string} | null>(null);

  const liveRef = useRef(true);
  const loadingRef = useRef(false);

  const loadNextPage = useCallback(
    (page: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoadingMore(true);
      fetchReleasesPage(page, RAW_PAGE_SIZE)
        .then(({releases: raw, hasMore: more}) => {
          if (!liveRef.current) return;
          setReleases((prev) => [...prev, ...releasesForApp(raw, app)]);
          setRawPage(page + 1);
          setHasMore(more);
          setLoadMoreFailed(false);
        })
        .catch(() => {
          if (!liveRef.current) return;
          if (page === 1) setFailed(true);
          else setLoadMoreFailed(true);
        })
        .finally(() => {
          loadingRef.current = false;
          if (liveRef.current) {
            setLoadingMore(false);
            setPending(false);
          }
        });
    },
    [app],
  );

  // Resets pagination whenever the app changes — otherwise switching from
  // pos to orbit would resume from wherever pos's raw-page cursor left off,
  // silently skipping raw pages orbit needed to see.
  useEffect(() => {
    liveRef.current = true;
    setReleases([]);
    setRawPage(1);
    setHasMore(true);
    setPending(true);
    setFailed(false);
    setLoadMoreFailed(false);
    setHighlightTag(null);
    const params = new URLSearchParams(window.location.search);
    setPendingBuild(decodeBuildId(params.get('b')));
    const queryEnv = app.hasEnvironments
      ? resolveEnvParam(params.get('environment'))
      : null;
    setEnv(queryEnv ?? DEFAULT_ENV);
    loadNextPage(1);
    return () => {
      liveRef.current = false;
    };
  }, [app, loadNextPage]);

  // Loads more raw pages, scroll position aside, while a shared ?b=<id>
  // link's target hasn't shown up yet — so a shared link resolves without
  // the visitor needing to scroll to trigger the sentinel below. Stops once
  // found, or once the feed is exhausted (hasMore false).
  useEffect(() => {
    if (!pendingBuild) return;
    const match = releases.find(
      (r) => releaseVersion(app, r) === pendingBuild.v || r.tag === pendingBuild.v,
    );
    if (match) {
      setHighlightTag(match.tag);
      if (
        app.hasEnvironments &&
        ENVIRONMENTS.some((e) => e.value === pendingBuild.channel)
      ) {
        setEnv(pendingBuild.channel);
      }
      setPendingBuild(null);
      return;
    }
    if (!hasMore) {
      setPendingBuild(null);
      return;
    }
    loadNextPage(rawPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releases, hasMore]);

  // Fetches the next page once the sentinel row scrolls near the viewport.
  const sentinelRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPage(rawPage);
      },
      {rootMargin: '200px'},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, rawPage, loadNextPage]);

  // Triggers the download from a real <button>, not a visible <a> — so
  // hovering it never shows the asset's raw URL in the browser's link
  // preview the way a styled anchor would.
  function downloadAsset(asset: Asset) {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function copyLink(version: string, tag: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('b', encodeBuildId(version, env));
    const link = url.toString();
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 1500);
      })
      .catch(() => window.prompt('Copy this link:', link));
  }

  return (
    <Layout
      title={`${app.label} downloads`}
      description={`Every ${app.label} release, newest first.`}>
      <div className={clsx('container', styles.page)}>
        <Heading as="h1">{app.label} downloads</Heading>
        <p>Every release, newest first. Windows installer only.</p>

        {pending && <Loading label="Loading releases…" />}

        {failed && (
          <p>
            The release list could not be loaded — GitHub may be unreachable or
            rate-limiting this network. Everything is on the{' '}
            <a href={RELEASES_URL}>releases page</a>.
          </p>
        )}

        {!pending && !failed && (
          <div className={styles.versionsPanel}>
            <span className={styles.panelLabel}>Versions</span>
            <ul className={styles.versions}>
              {releases.map((r, i) => {
                const rowVersion = displayVersion(app, r);
                const rowAsset = installerFor(app, r, env);
                if (!rowAsset) return null;
                const rowBuiltAt = parseInstaller(app, rowAsset.name)?.builtAt;
                return (
                  <li
                    key={r.tag}
                    className={clsx(
                      styles.versionRow,
                      r.tag === highlightTag && styles.selected,
                    )}>
                    <span className={styles.versionLabel} title={r.tag}>
                      <span className={styles.versionNumber}>
                        v{rowVersion}
                      </span>
                      <span
                        className={clsx(
                          styles.latest,
                          i !== 0 && styles.latestHidden,
                        )}>
                        Latest
                      </span>
                    </span>

                    {rowBuiltAt && (
                      <span className={styles.builtAt}>
                        Built {formatBuiltAt(rowBuiltAt)}
                      </span>
                    )}
                    <span className={styles.size}>
                      {formatSize(rowAsset.size)}
                    </span>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.downloadButton}
                        onClick={() => downloadAsset(rowAsset)}>
                        <DownloadIcon />
                        Download
                      </button>
                      <button
                        type="button"
                        className={styles.shareButton}
                        aria-label={
                          copiedTag === r.tag
                            ? 'Link copied'
                            : 'Copy link to this build'
                        }
                        title={
                          copiedTag === r.tag
                            ? 'Link copied'
                            : 'Copy link to this build'
                        }
                        onClick={() => copyLink(rowVersion, r.tag)}>
                        {copiedTag === r.tag ? <CheckIcon /> : <ShareIcon />}
                      </button>
                    </div>
                  </li>
                );
              })}
              {hasMore && (
                <li ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
              )}
            </ul>
            {loadingMore && (
              <p className={styles.loadingMore}>Loading more…</p>
            )}
            {loadMoreFailed && (
              <p className={styles.loadMoreFailed}>
                Couldn't load more releases.{' '}
                <button type="button" onClick={() => loadNextPage(rawPage)}>
                  Try again
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
