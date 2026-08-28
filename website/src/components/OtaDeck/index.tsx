import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './styles.module.css';

const SLIDE_COUNT = 6;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * The Windows OTA explainer, as a paged deck.
 *
 * Slides are authored against a fixed 1600x900 stage and scaled to the frame
 * with container query units (see styles.module.css), so the server-rendered
 * markup is already correctly sized — no layout work happens in JavaScript.
 */
export default function OtaDeck(): ReactNode {
  const [index, setIndex] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const scratUrl = useBaseUrl('img/scrat.png');

  const go = useCallback((n: number) => {
    setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, n)));
  }, []);

  /**
   * Fallback for browsers without calc() length division (dividing 100cqw by a
   * px length to get a unitless scale). Without it the stage would render at a
   * full 1600px and overflow the frame. Only ever writes an inline transform
   * when the stylesheet's own scale did not apply.
   */
  useEffect(() => {
    const frame = frameRef.current;
    const stage = frame?.firstElementChild as HTMLElement | null;
    if (!frame || !stage) return;

    const apply = () => {
      const applied = getComputedStyle(stage).transform;
      const cssScaled = applied && applied !== 'none' && applied !== 'matrix(1, 0, 0, 1, 0, 0)';
      if (cssScaled) return;
      stage.style.transform = `scale(${frame.clientWidth / 1600})`;
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  /**
   * Keys are handled on the frame, never on window: a page must keep its normal
   * arrow/space scrolling unless the reader has deliberately focused the deck.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(SLIDE_COUNT - 1);
    }
  };

  const slide = (n: number, className: string, children: ReactNode) => (
    <section
      className={clsx(styles.slide, className, n === index && styles.active)}
      aria-hidden={n !== index}>
      {children}
    </section>
  );

  return (
    <>
      <div
        ref={frameRef}
        className={clsx(styles.deck, styles.frame)}
        tabIndex={0}
        role="region"
        aria-roledescription="slide deck"
        aria-label="How Windows OTA works"
        onKeyDown={onKeyDown}>
        <div className={styles.stage}>
          <span className={clsx(styles.tick, styles.tl)} />
          <span className={clsx(styles.tick, styles.tr)} />
          <span className={clsx(styles.tick, styles.bl)} />
          <span className={clsx(styles.tick, styles.br)} />

          <div className={styles.railTop}>
            <span>
              Oolio POS <span className={styles.sig}>/</span> Desktop Platform
            </span>
            <span>
              Windows OTA <span className={styles.sig}>●</span> Live
            </span>
          </div>

          {/* 1 · title */}
          {slide(
            0,
            styles.title,
            <>
              <div className={styles.beam} />
              <h1 className={clsx(styles.r, styles.h1)}>
                Windows
                <br />
                <em>OTA</em>
              </h1>
              <div className={clsx(styles.r, styles.sub)}>
                The Windows POS app OTA updates — no remoting in, no manual
                installs.
              </div>
              <div className={clsx(styles.r, styles.byline)}>
                <span className={styles.term}>
                  Oolio POS<b>The Windows desktop app used in operations</b>
                </span>
                <span className={styles.term}>
                  Orbit
                  <b>Where we control deployments — per organisation, or all</b>
                </span>
              </div>
            </>,
          )}

          {/* 2 · why */}
          {slide(
            1,
            '',
            <>
              <div className={clsx(styles.r, styles.eyebrow)}>
                Why we built it
              </div>
              <div className={styles.split}>
                <div className={clsx(styles.col, styles.colLeft, styles.r)}>
                  <span className={clsx(styles.tag, styles.tagBad)}>
                    Without OTA
                  </span>
                  <h3>
                    Delivered in minutes.
                    <br />
                    Installed by hand.
                  </h3>
                  <ul>
                    <li>
                      The new version is built and published{' '}
                      <b>within minutes</b>.
                    </li>
                    <li>
                      Then it waits. Support remotes into each device,{' '}
                      <b>
                        uninstalls the current version and installs the new one
                      </b>
                      .
                    </li>
                    <li>
                      Installation is the only gap — and it needs a person for
                      every device.
                    </li>
                  </ul>
                </div>
                <div className={clsx(styles.divider, styles.r)} />
                <div className={clsx(styles.col, styles.colRight, styles.r)}>
                  <span className={clsx(styles.tag, styles.tagGood)}>
                    With OTA
                  </span>
                  <h3>
                    Skipping the uninstall and re-install loop for every new
                    feature or hotfix.
                  </h3>
                  <ul>
                    <li>
                      We release once, from Orbit.{' '}
                      <b>Nobody remotes into anything.</b>
                    </li>
                    <li>
                      Devices restart daily —{' '}
                      <b>the update installs itself on the next start</b>.
                    </li>
                    <li>One device or a multiple: the same single action.</li>
                  </ul>
                </div>
              </div>
              <div className={clsx(styles.r, styles.future)}>
                <span className={styles.flabel}>Future</span>
                Updates land on the next restart. <b>Instant updates</b> —
                pushing a fix to a running device without waiting for one — are
                not available today, and are an option we can consider next.
              </div>
            </>,
          )}

          {/* 3 · how it works */}
          {slide(
            2,
            '',
            <>
              <div className={clsx(styles.r, styles.eyebrow)}>
                How it works — start to finish
              </div>
              <div className={styles.flowWrap}>
                <div className={clsx(styles.flow, styles.r)}>
                  <div className={styles.step}>
                    <div className={styles.node}>01</div>
                    <div className={styles.st}>Build</div>
                    <p>
                      Engineering finishes a change. It’s built and registered
                      as a new version.
                    </p>
                  </div>
                  <div className={styles.step}>
                    <div className={styles.node}>02</div>
                    <div className={styles.st}>Choose</div>
                    <p>
                      In <b>Orbit</b>, a person decides who gets it — one
                      organisation, a few, or all of them.
                    </p>
                  </div>
                  <div className={styles.step}>
                    <div className={styles.node}>03</div>
                    <div className={styles.st}>Ask</div>
                    <p>
                      Oolio POS asks:{' '}
                      <q>
                        I’m this device, in this organisation — what should I be
                        running?
                      </q>
                    </p>
                  </div>
                  <div className={styles.step}>
                    <div className={styles.node}>04</div>
                    <div className={styles.st}>Install</div>
                    <p>
                      The app downloads it, checks the signature, installs, and
                      restarts.
                    </p>
                  </div>
                  <div className={styles.step}>
                    <div className={styles.node}>05</div>
                    <div className={styles.st}>Report</div>
                    <p>
                      The device reports back which version it’s on, and whether
                      it’s healthy.
                    </p>
                  </div>
                </div>
                <div className={clsx(styles.hr, styles.r)} />
                <p className={clsx(styles.note, styles.r)}>
                  Every version is <b>signed</b> — a device will not run
                  software we didn’t sign. And step 02 is a deliberate human
                  decision: <b>building a version doesn’t send it to anyone.</b>
                </p>
              </div>
            </>,
          )}

          {/* 4 · advantages */}
          {slide(
            3,
            '',
            <>
              <div className={clsx(styles.r, styles.eyebrow)}>
                The advantages — four things we get
              </div>
              <div className={clsx(styles.tiles, styles.r)}>
                <div className={clsx(styles.tile, styles.t1)}>
                  <span className={styles.idx}>01</span>
                  <div className={styles.tileName}>Rollout</div>
                  <div className={styles.tileOne}>
                    Ship to a few before the many
                  </div>
                  <p>
                    One organisation first. Then a few. Then all of them.
                    Widening a rollout only <b>adds</b> organisations — nobody
                    already on it gets dropped.
                  </p>
                </div>
                <div className={clsx(styles.tile, styles.t2)}>
                  <span className={styles.idx}>02</span>
                  <div className={styles.tileName}>Rollback</div>
                  <div className={styles.tileOne}>One switch, everyone back</div>
                  <p>
                    Turn a version off in Orbit and every device on it returns
                    to the previous one. <b>One version back</b> — that’s the
                    depth we keep.
                  </p>
                </div>
                <div className={clsx(styles.tile, styles.t3)}>
                  <span className={styles.idx}>03</span>
                  <div className={styles.tileName}>Crash recovery</div>
                  <div className={styles.tileOne}>The device saves itself</div>
                  <p>
                    If a new version won’t start, the device notices, refuses
                    that version for good, and{' '}
                    <b>reinstalls the old one from its own disk</b> — no
                    internet, no support call.
                  </p>
                </div>
                <div className={clsx(styles.tile, styles.t4)}>
                  <span className={styles.idx}>04</span>
                  <div className={styles.tileName}>Version snapshot</div>
                  <div className={styles.tileOne}>
                    Who is on what, right now
                  </div>
                  <p>
                    Every device checks in with its organisation, its version
                    and its health. One screen in Orbit answers{' '}
                    <b>“is that organisation on the new version yet?”</b>
                  </p>
                </div>
              </div>
            </>,
          )}

          {/* 5 · remember */}
          {slide(
            4,
            '',
            <>
              <div className={clsx(styles.r, styles.eyebrow)}>
                Three things worth remembering
              </div>
              <div className={styles.facts}>
                <div className={clsx(styles.fact, styles.r)}>
                  <div className={styles.factN}>01</div>
                  <div>
                    <h4>Releasing is a decision, not an event</h4>
                    <p>
                      A new version existing means <b>nothing has shipped</b>.
                      Someone still has to target it in Orbit — and that has to
                      happen <b>before</b> a device installs it.
                    </p>
                  </div>
                </div>
                <div className={clsx(styles.fact, styles.r)}>
                  <div className={styles.factN}>02</div>
                  <div>
                    <h4>Rolled out is not the same as installed</h4>
                    <p>
                      A device only checks when someone signs in, or when staff
                      press “check for updates”. Nothing runs on a timer. So the{' '}
                      <span className={styles.flag}>
                        Devices column in Orbit is the only truth
                      </span>{' '}
                      about what’s actually out there.
                    </p>
                  </div>
                </div>
                <div className={clsx(styles.fact, styles.r)}>
                  <div className={styles.factN}>03</div>
                  <div>
                    <h4>The app can restart itself</h4>
                    <p>
                      On the automatic path it installs and restarts without
                      asking. That’s deliberate — it’s the price of{' '}
                      <b>nobody having to press anything</b>. Staff can also
                      trigger it from Settings and restart when it suits them.
                    </p>
                  </div>
                </div>
              </div>
            </>,
          )}

          {/* 6 · thank you */}
          {slide(
            5,
            styles.thanks,
            <>
              <div className={clsx(styles.r, styles.eyebrow)}>
                That’s the update
              </div>
              <div className={clsx(styles.r, styles.ty)}>
                Thank
                <br />
                <em>you</em>
              </div>
              <div className={clsx(styles.r, styles.q)}>Questions?</div>
              <img className={styles.scrat} alt="" src={scratUrl} />
            </>,
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.dots}>
          {Array.from({length: SLIDE_COUNT}, (_, n) => (
            <button
              key={n}
              type="button"
              className={clsx(styles.dot, n === index && styles.dotOn)}
              aria-label={`Go to slide ${n + 1}`}
              aria-current={n === index}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <span className={styles.counter} aria-live="polite">
          {pad2(index + 1)} / {pad2(SLIDE_COUNT)}
        </span>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous slide">
          ←
        </button>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(index + 1)}
          disabled={index === SLIDE_COUNT - 1}
          aria-label="Next slide">
          →
        </button>
      </div>

      <p className={styles.smallScreenNote}>
        This deck is designed for a wide screen — it’s easier to read on a
        tablet or laptop.
      </p>
    </>
  );
}
