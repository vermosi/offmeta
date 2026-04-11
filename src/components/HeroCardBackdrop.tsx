/**
 * Cinematic fanned MTG card stack behind the hero section.
 * Desktop: 5 cards in a dramatic arc with float animations.
 * Mobile: 3 subtle cards visible.
 * @module components/HeroCardBackdrop
 */

const BACKDROP_CARDS = [
  {
    src: 'https://cards.scryfall.io/normal/front/1/7/175eb155-7262-4c2e-85c3-e0cc9be855e5.jpg?1775052162',
    alt: '',
    className: 'hero-card hero-card-1',
  },
  {
    src: 'https://cards.scryfall.io/normal/front/a/3/a31ffc9e-d21b-4a8f-ac67-695e38e09e3b.jpg?1706240553',
    alt: '',
    className: 'hero-card hero-card-2',
  },
  {
    src: 'https://cards.scryfall.io/normal/front/c/c/cc80f3f1-e842-4c07-ab4c-2e3884ecb441.jpg?1682718882',
    alt: '',
    className: 'hero-card hero-card-3',
  },
  {
    src: 'https://cards.scryfall.io/normal/front/8/4/84056124-1a6f-4274-bee2-74cf0debddb5.jpg?1698988237',
    alt: '',
    className: 'hero-card hero-card-4',
  },
  {
    src: 'https://cards.scryfall.io/normal/front/3/8/3892f1c5-937e-4ef4-b6f9-e0c0ded070d0.jpg?1706240181',
    alt: '',
    className: 'hero-card hero-card-5',
  },
] as const;

export function HeroCardBackdrop() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Radial gradient mask — cards fade into background */}
      <div className="absolute inset-0 z-10 hero-card-mask" />

      <div className="hero-card-fan">
        {BACKDROP_CARDS.map((card, i) => (
          <div key={i} className={card.className}>
            <img
              src={card.src}
              alt={card.alt}
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
