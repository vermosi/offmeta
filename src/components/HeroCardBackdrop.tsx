/**
 * Cinematic fanned MTG card stack behind the hero section.
 * Desktop: 6 cards in a dramatic arc with float animations.
 * Mobile: 4 subtle cards visible (hides outermost pair).
 * Cards are randomly selected from a pool on each mount.
 * @module components/HeroCardBackdrop
 */

import { useMemo } from 'react';

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

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Radial gradient mask — cards fade into background */}
      <div className="absolute inset-0 z-10 hero-card-mask" />

      <div className="hero-card-fan">
        {cards.map((src, i) => (
          <div key={i} className={`hero-card hero-card-${i + 1}`}>
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
