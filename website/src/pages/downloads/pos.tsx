import type {ReactNode} from 'react';

import DownloadsPage from '@site/src/components/DownloadsPage';
import {APPS} from '@site/src/lib/releases';

const app = APPS.find((a) => a.id === 'pos')!;

export default function PosDownloads(): ReactNode {
  return <DownloadsPage app={app} />;
}
