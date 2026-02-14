import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExplainCompilationPanel } from '../ExplainCompilationPanel';
import type { SearchIntent } from '@/types/search';

const mockIntent: SearchIntent = {
  colors: { values: ['G'], isIdentity: false, isExact: false, isOr: false },
  types: ['creature'],
  cmc: { op: '<=', value: 3 },
  power: null,
  toughness: null,
  tags: ['ramp'],
  oraclePatterns: ['add {G}'],
  warnings: [],
};

const emptyIntent: SearchIntent = {
  colors: null,
  types: [],
  cmc: null,
  power: null,
  toughness: null,
  tags: [],
  oraclePatterns: [],
  warnings: [],
};

describe('ExplainCompilationPanel', () => {
  it('returns null when intent is null', () => {
    const { container } = render(<ExplainCompilationPanel intent={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the toggle button', () => {
    render(<ExplainCompilationPanel intent={mockIntent} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Show details');
  });

  it('shows detected count when collapsed and fields have values', () => {
    render(<ExplainCompilationPanel intent={mockIntent} />);
    expect(screen.getByText(/4 detected/)).toBeInTheDocument();
  });

  it('does not show detected count when no fields have values', () => {
    render(<ExplainCompilationPanel intent={emptyIntent} />);
    expect(screen.queryByText(/detected/)).not.toBeInTheDocument();
  });

  it('expands to show details when clicked', () => {
    render(<ExplainCompilationPanel intent={mockIntent} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(button).toHaveTextContent('Hide details');
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Types')).toBeInTheDocument();
    expect(screen.getByText('Mana value')).toBeInTheDocument();
  });

  it('displays color summary correctly', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('c:G')).toBeInTheDocument();
  });

  it('displays types correctly', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('creature')).toBeInTheDocument();
  });

  it('displays mana value correctly', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('mv<=3')).toBeInTheDocument();
  });

  it('displays tags when present', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('ramp')).toBeInTheDocument();
  });

  it('displays oracle patterns when present', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('add {G}')).toBeInTheDocument();
  });

  it('displays warnings when present', () => {
    const intentWithWarnings = {
      ...mockIntent,
      warnings: ['Unsupported tag removed'],
    };
    render(<ExplainCompilationPanel intent={intentWithWarnings} defaultOpen />);
    expect(screen.getByText('Unsupported tag removed')).toBeInTheDocument();
  });

  it('toggle button has pill styling (bg-secondary)', () => {
    const { container } = render(<ExplainCompilationPanel intent={mockIntent} />);
    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-secondary');
    expect(button?.className).toContain('border');
  });

  it('has proper aria-expanded attribute', () => {
    render(<ExplainCompilationPanel intent={mockIntent} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts open when defaultOpen is true', () => {
    render(<ExplainCompilationPanel intent={mockIntent} defaultOpen />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Hide details')).toBeInTheDocument();
  });
});
