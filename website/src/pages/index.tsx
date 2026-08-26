import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import FloatingItems from '@site/src/components/FloatingItems';
import Loading from '@site/src/components/Loading';
import {
  envLabel,
  fetchReleases,
  latestInstallers,
  RELEASES_URL,
  type Installer,
} from '@site/src/lib/releases';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('img/logo.png');

  const [installers, setInstallers] = useState<Installer[] | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchReleases()
      .then((releases) => live && setInstallers(latestInstallers(releases)))
      .catch(() => live && setFailed(true))
      .finally(() => live && setPending(false));
    return () => {
      live = false;
    };
  }, []);

  // The environment someone hitting the homepage most likely wants: the one
  // that shipped most recently, across all environments.
  const primary = installers?.[0];
  const hasOtherEnvironments = (installers?.length ?? 0) > 1;

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

          {primary && (
            <>
              <a
                className="button button--primary button--lg"
                href={primary.asset.url}>
                Download for Windows
              </a>
              <p className={styles.meta}>
                {envLabel(primary.env)} · v{primary.version}
              </p>
            </>
          )}

          {installers && installers.length === 0 && !pending && !failed && (
            <p className={styles.meta}>
              No installer builds found. Everything is on the{' '}
              <a href={RELEASES_URL}>releases page</a>.
            </p>
          )}

          {hasOtherEnvironments && (
            <p className={styles.more}>
              Need a different environment?{' '}
              <Link to="/downloads">See all downloads</Link>
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
