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

export default function Downloads(): ReactNode {
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  // An index rather than a tag: the sidebar re-renders in fetch order, and an
  // index survives that fine since the list itself never reorders in place.
  const [selected, setSelected] = useState(0);
  const [env, setEnv] = useState(DEFAULT_ENV);

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

  const release = releases?.[selected];
  const asset = release && installerFor(release, env);

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
