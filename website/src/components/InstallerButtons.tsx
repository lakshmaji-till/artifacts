import type {ReactNode} from 'react';

import {envLabel, LATEST_URL, type Installer} from '@site/src/lib/releases';
import styles from './InstallerButtons.module.css';

/**
 * One button per environment, for the Windows installer someone in that
 * environment should actually run. This is the whole point of the page: a
 * release history with several environments in it should never leave someone
 * guessing which .exe is theirs.
 *
 * `installers` is empty before the fetch lands, on the server, and whenever
 * GitHub is unreachable or rate-limiting. That state renders a single button
 * pointing at the releases page instead of nothing — there's always
 * somewhere to click.
 */
export default function InstallerButtons({
  installers,
}: {
  installers: Installer[];
}): ReactNode {
  if (installers.length === 0) {
    return (
      <div className={styles.row}>
        <a className="button button--primary button--lg" href={LATEST_URL}>
          <span>Download for Windows</span>
          <span className={styles.file}>Latest release</span>
        </a>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      {installers.map((installer) => (
        <a
          key={installer.env}
          className="button button--primary button--lg"
          href={installer.asset.url}>
          <span>Download for Windows</span>
          <span className={styles.file}>
            {envLabel(installer.env)} · v{installer.version}
          </span>
        </a>
      ))}
    </div>
  );
}
