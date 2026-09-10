import {useEffect, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import FloatingItems from '@site/src/components/FloatingItems';
import Loading from '@site/src/components/Loading';
import {
  APPS,
  fetchReleases,
  latestInstallers,
  releasesForApp,
  RELEASES_URL,
  type Release,
} from '@site/src/lib/releases';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('img/logo.png');

  const [releases, setReleases] = useState<Release[] | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);

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

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <div className={styles.hero}>
        <FloatingItems />
        <div className={styles.card}>
          <img src={logoUrl} alt="" className={styles.icon} />
          <Heading as="h1" className={styles.title}>
            {siteConfig.title}
          </Heading>
          <p className={styles.tagline}>{siteConfig.tagline}</p>

          {pending && <Loading label="Loading releases…" />}

          {failed && (
            <p className={styles.meta}>
              The release list could not be loaded — GitHub may be
              unreachable or rate-limiting this network. Everything is on the{' '}
              <a href={RELEASES_URL}>releases page</a>.
            </p>
          )}

          {releases && (
            <div className={styles.apps}>
              {APPS.map((app) => {
                // The environment someone hitting the homepage most likely
                // wants: the one that shipped most recently, across all
                // environments (or the only build, for apps without them).
                const primary = latestInstallers(
                  app,
                  releasesForApp(releases, app),
                )[0];

                return primary ? (
                  <a
                    key={app.id}
                    className="button button--primary button--lg"
                    href={primary.asset.url}>
                    Download {app.shortLabel}
                  </a>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
