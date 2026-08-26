import {useEffect, useRef, type ReactNode} from 'react';
import {animate, utils} from 'animejs';

import styles from './FloatingItems.module.css';

// Points of sale sell food and drink, not code — the background says so
// directly instead of with an abstract pattern.
const ITEMS = [
  '🍔', // burger
  '🍕', // pizza
  '🌭', // hot dog
  '🍟', // fries
  '🍿', // popcorn
  '☕', // coffee cup
  '🥤', // takeaway cup
  '🥛', // milkshake
  '🧃', // soda
  '🍦', // ice cream
  '🍗', // chicken drumstick
  '🥩', // steak
  '🌮', // taco
  '🌯', // burrito
  '🍣', // sushi roll
  '🍜', // noodle bowl
  '🥦', // broccoli
  '🥕', // carrot
  '🥑', // avocado
  '🍄', // mushroom
];
const COUNT = 30;

/**
 * A field of drifting POS-item emoji behind the hero card, in the loose,
 * organic style animejs.com uses for its own background. Pure decoration —
 * `aria-hidden` and `pointer-events: none` — so it never competes with the
 * download button for a click or a screen reader's attention.
 */
export default function FloatingItems(): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Respected the same way Loading's spinner is: the field simply holds
    // still rather than skipping the motion check per element.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animations = Array.from(container.children).map((el) =>
      animate(el, {
        translateX: () => utils.random(-32, 32),
        translateY: () => utils.random(-48, 48),
        rotate: () => utils.random(-20, 20),
        duration: () => utils.random(7000, 16000),
        delay: () => utils.random(0, 4000),
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      }),
    );

    return () => animations.forEach((a) => a.pause());
  }, []);

  // A pseudo-random but fixed layout: no two items land on the same spot,
  // and it's identical on every render (no Date.now/Math.random re-seed on
  // re-render, which would otherwise jump the field around).
  const positions = Array.from({length: COUNT}, (_, i) => ({
    left: `${(i * 41 + 7) % 100}%`,
    top: `${(i * 29 + 13) % 100}%`,
    fontSize: `${1.4 + ((i * 17) % 5) * 0.35}rem`,
  }));

  return (
    <div ref={containerRef} className={styles.field} aria-hidden="true">
      {positions.map((pos, i) => (
        <span key={i} className={styles.item} style={pos}>
          {ITEMS[i % ITEMS.length]}
        </span>
      ))}
    </div>
  );
}
