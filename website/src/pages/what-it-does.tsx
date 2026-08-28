import type {ReactNode} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import OtaDeck from '@site/src/components/OtaDeck';
import styles from './what-it-does.module.css';

export default function WhatItDoes(): ReactNode {
  return (
    <Layout
      title="What it does"
      description="How Windows OTA updates the POS Desktop app — without anyone remoting in.">
      <div className={clsx('container', styles.page)}>
        <Heading as="h1">What it does</Heading>
        <p className={styles.lede}>
          POS Desktop updates itself over the air. Six slides on how that works,
          what it gives us, and what to watch out for.
        </p>

        <OtaDeck />
      </div>
    </Layout>
  );
}
