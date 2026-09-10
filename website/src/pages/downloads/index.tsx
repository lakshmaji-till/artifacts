import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import {APPS} from '@site/src/lib/releases';
import styles from './index.module.css';

/** Picks which app's downloads to browse — the landing spot for "/downloads". */
export default function DownloadsIndex(): ReactNode {
  return (
    <Layout title="Download" description="Download an Oolio app installer.">
      <div className={clsx('container', styles.page)}>
        <Heading as="h1">Download</Heading>
        <p>Pick an app to see its releases.</p>

        <div className={styles.apps}>
          {APPS.map((app) => (
            <Link key={app.id} className={styles.app} to={`/downloads/${app.id}`}>
              <span className={styles.appLabel}>{app.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
