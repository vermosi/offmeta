/**
 * Cinematic fanned MTG card stack behind the hero section.
 * Desktop: 6 cards in a dramatic arc with float animations.
 * Mobile: 4 subtle cards visible (hides outermost pair).
 * Cards are randomly selected from a pool on each mount.
 * @module components/HeroCardBackdrop
 */

import { useMemo, useState, type SyntheticEvent } from 'react';

/**
 * Inline SVG silhouette used when a Scryfall image fails or is slow to load.
 * A soft rounded card shape with a subtle inner glow — matches the hero aesthetic
 * and prevents the slot from collapsing/flashing on error.
 */
const CARD_FALLBACK_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 280' preserveAspectRatio='xMidYMid slice'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stop-color='hsl(265 40% 20%)' stop-opacity='0.85'/>
          <stop offset='100%' stop-color='hsl(200 40% 12%)' stop-opacity='0.85'/>
        </linearGradient>
        <radialGradient id='glow' cx='50%' cy='45%' r='60%'>
          <stop offset='0%' stop-color='hsl(280 60% 55%)' stop-opacity='0.35'/>
          <stop offset='100%' stop-color='hsl(280 60% 55%)' stop-opacity='0'/>
        </radialGradient>
      </defs>
      <rect width='200' height='280' rx='14' ry='14' fill='url(#g)'/>
      <rect width='200' height='280' rx='14' ry='14' fill='url(#glow)'/>
    </svg>`
  );

/** Pool of iconic MTG card images to randomly pick from. */
const CARD_POOL = [
  'https://cards.scryfall.io/normal/front/1/7/175eb155-7262-4c2e-85c3-e0cc9be855e5.jpg?1775052162',
  'https://cards.scryfall.io/normal/front/a/3/a31ffc9e-d21b-4a8f-ac67-695e38e09e3b.jpg?1706240553',
  'https://cards.scryfall.io/normal/front/c/c/cc80f3f1-e842-4c07-ab4c-2e3884ecb441.jpg?1682718882',
  'https://cards.scryfall.io/normal/front/8/4/84056124-1a6f-4274-bee2-74cf0debddb5.jpg?1698988237',
  'https://cards.scryfall.io/normal/front/3/8/3892f1c5-937e-4ef4-b6f9-e0c0ded070d0.jpg?1706240181',
  // Atraxa
  'https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg?1599707796',
  // Sheoldred
  'https://cards.scryfall.io/normal/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg?1674057568',
  // Ragavan
  'https://cards.scryfall.io/normal/front/a/9/a9738cda-adb1-47fb-9f4c-ecd930228c4d.jpg?1681963138',
  // Omnath Locus of Creation
  'https://cards.scryfall.io/normal/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg?1639436752',
  // Dockside Extortionist
  'https://cards.scryfall.io/normal/front/9/e/9e2e3571-a771-4b7d-a2e1-a34d85f49e2f.jpg?1690680744',
  // Smothering Tithe
  'https://cards.scryfall.io/normal/front/f/2/f25a4bbe-2af0-4d4a-95d4-d52c5937c747.jpg?1674108405',
  // Cyclonic Rift
  'https://cards.scryfall.io/normal/front/f/f/ff08e5ed-f47b-4d8e-8b8b-41675dccef8b.jpg?1598304259',
  // Rhystic Study
  'https://cards.scryfall.io/normal/front/d/6/d6914dba-0d27-4055-ac34-b3ebf5c5f0be.jpg?1600698439',
  // The One Ring
  'https://cards.scryfall.io/normal/front/d/5/d5806e68-1054-458e-bcd0-27571f3f495d.jpg?1696020967',
] as const;

const CARD_COUNT = 6;

function shuffleAndPick<T>(pool: readonly T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function HeroCardBackdrop() {
  const cards = useMemo(() => shuffleAndPick(CARD_POOL, CARD_COUNT), []);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const handleError = (i: number) => (e: SyntheticEvent<HTMLImageElement>) => {
    if (failed[i]) return;
    setFailed((prev) => ({ ...prev, [i]: true }));
    e.currentTarget.src = CARD_FALLBACK_SVG;
    // Fallback SVG counts as loaded so it stays visible without another fade.
    setLoaded((prev) => ({ ...prev, [i]: true }));
  };

  const handleLoad = (i: number) => () => {
    setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Radial gradient mask — cards fade into background */}
      <div className="absolute inset-0 z-10 hero-card-mask" />

      <div className="hero-card-fan">
        {cards.map((src, i) => {
          // The first/center card is the LCP candidate — load eagerly with high
          // fetch priority. Remaining cards stay lazy to preserve bandwidth.
          const isLcp = i === 0;
          const isLoaded = loaded[i] ?? false;
          return (
            <div
              key={i}
              className={`hero-card hero-card-${i + 1}`}
              style={{
                // Silhouette backdrop guarantees the slot is always visible,
                // even before the network image resolves or if it fails.
                backgroundImage: `url("${CARD_FALLBACK_SVG}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <img
                src={failed[i] ? CARD_FALLBACK_SVG : src}
                alt=""
                width={200}
                height={280}
                loading={isLcp ? 'eager' : 'lazy'}
                fetchPriority={isLcp ? 'high' : 'auto'}
                decoding="async"
                onError={handleError(i)}
                onLoad={handleLoad(i)}
                style={{
                  opacity: isLoaded ? 1 : 0,
                  transition: 'opacity 500ms ease-out',
                }}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
