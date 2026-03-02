import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardSkeleton, CardSkeletonGrid } from '../CardSkeleton';

describe('CardSkeleton', () => {
  it('renders skeleton container', () => {
    const { container } = render(<CardSkeleton />);
    // CardSkeleton renders a div.space-y-2 with child skeleton divs
    expect(container.querySelector('.space-y-2')).toBeInTheDocument();
    expect(container.querySelector('.space-y-2')?.children.length).toBeGreaterThan(0);
  });
});

describe('CardSkeletonGrid', () => {
  it('renders default 10 skeletons', () => {
    const { container } = render(<CardSkeletonGrid />);
    // Each CardSkeleton is a div with space-y-2
    const skeletons = container.querySelectorAll('.space-y-2');
    expect(skeletons).toHaveLength(10);
  });

  it('renders custom count', () => {
    const { container } = render(<CardSkeletonGrid count={3} />);
    const skeletons = container.querySelectorAll('.space-y-2');
    expect(skeletons).toHaveLength(3);
  });

  it('has accessible loading role', () => {
    render(<CardSkeletonGrid />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has sr-only loading text', () => {
    render(<CardSkeletonGrid />);
    expect(screen.getByText('Loading search results')).toBeInTheDocument();
  });
});
