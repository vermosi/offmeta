/**
 * Decorative fanned MTG card art behind the hero section.
 * Hidden on mobile for performance. Pure CSS transforms + opacity.
 * @module components/HeroCardBackdrop
 */

const BACKDROP_CARDS = [
  {
    src: 'https://cards.scryfall.io/art_crop/front/1/7/175eb155-7262-4c2e-85c3-e0cc9be855e5.jpg?1775052162',
    alt: '',
    style: { left: '5%', top: '10%', rotate: '-12deg', scale: '0.9' },
  },
  {
    src: 'https://cards.scryfall.io/art_crop/front/a/3/a31ffc9e-d21b-4a8f-ac67-695e38e09e3b.jpg?1706240553',
    alt: '',
    style: { left: '25%', top: '-5%', rotate: '-4deg', scale: '1' },
  },
  {
    src: 'https://cards.scryfall.io/art_crop/front/8/4/84056124-1a6f-4274-bee2-74cf0debddb5.jpg?1698988237',
    alt: '',
    style: { right: '25%', top: '-5%', rotate: '5deg', scale: '1' },
  },
  {
    src: 'https://cards.scryfall.io/art_crop/front/3/8/3892f1c5-937e-4ef4-b6f9-e0c0ded070d0.jpg?1706240181',
    alt: '',
    style: { right: '5%', top: '10%', rotate: '13deg', scale: '0.9' },
  },
] as const;

export function HeroCardBackdrop() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block"
      aria-hidden="true"
    >
      {/* Gradient mask to fade cards into background */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />

      {BACKDROP_CARDS.map((card, i) => (
        <div
          key={i}
          className="absolute w-[220px] h-[160px] rounded-xl overflow-hidden opacity-[0.15] blur-[0.5px]"
          style={{
            ...card.style,
            transform: `rotate(${card.style.rotate}) scale(${card.style.scale})`,
          }}
        >
          <img
            src={card.src}
            alt={card.alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
