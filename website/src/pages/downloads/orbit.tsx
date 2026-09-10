import type {ReactNode} from 'react';

import DownloadsPage from '@site/src/components/DownloadsPage';
import {APPS} from '@site/src/lib/releases';

const app = APPS.find((a) => a.id === 'orbit')!;

export default function OrbitDownloads(): ReactNode {
  return <DownloadsPage app={app} />;
}
