import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardItem } from '../CardItem';
import type { ScryfallCard } from '@/types/card';

vi.mock('@/lib/scryfall/client', () => ({
  getCardImage: (_card: unknown, _size: string) => 'https://example.com/card.jpg',
}));

const mockCard = {
  id: 'test-id',
  name: 'Lightning Bolt',
  cmc: 1,
  type_line: 'Instant',
  color_identity: ['R'],
  set: 'lea',
  set_name: 'Limited Edition Alpha',
  rarity: 'common',
  scryfall_uri: 'https://scryfall.com/card/lea/161',
  image_uris: { normal: 'https://example.com/card.jpg' },
  prices: { usd: '1.00' },
  legalities: { standard: 'not_legal' },
} as unknown as ScryfallCard;

describe('CardItem', () => {
  it('renders the card image with correct alt text', () => {
    render(<CardItem card={mockCard} onClick={vi.fn()} />);
    const img = screen.getByAltText('Lightning Bolt');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/card.jpg');
  });

  it('has correct aria-label', () => {
    render(<CardItem card={mockCard} onClick={vi.fn()} />);
    expect(screen.getByLabelText('View details for Lightning Bolt')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<CardItem card={mockCard} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter key', () => {
    const onClick = vi.fn();
    render(<CardItem card={mockCard} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Space key', () => {
    const onClick = vi.fn();
    render(<CardItem card={mockCard} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows fallback text when image fails to load', () => {
    render(<CardItem card={mockCard} onClick={vi.fn()} />);
    const img = screen.getByAltText('Lightning Bolt');
    fireEvent.error(img);
    expect(screen.queryByAltText('Lightning Bolt')).not.toBeInTheDocument();
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
  });

  it('has lazy loading on the image', () => {
    render(<CardItem card={mockCard} onClick={vi.fn()} />);
    const img = screen.getByAltText('Lightning Bolt');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('is focusable with tabIndex 0', () => {
    render(<CardItem card={mockCard} onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabindex', '0');
  });
});
