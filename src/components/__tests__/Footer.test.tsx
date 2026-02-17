import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('renders the OffMeta brand name', () => {
    renderFooter();
    expect(screen.getByText('OffMeta')).toBeInTheDocument();
  });

  it('renders copyright year', () => {
    renderFooter();
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`© ${year}`))).toBeInTheDocument();
  });

  it('renders GitHub source link', () => {
    renderFooter();
    const link = screen.getByLabelText('View source on GitHub (opens in new tab)');
    expect(link).toHaveAttribute('href', 'https://github.com/vermosi/offmeta');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Scryfall attribution link', () => {
    renderFooter();
    const link = screen.getByText('Scryfall').closest('a');
    expect(link).toHaveAttribute('href', 'https://scryfall.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders Explore section with internal links', () => {
    renderFooter();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Archetypes')).toBeInTheDocument();
    expect(screen.getByText('Deck Recs')).toBeInTheDocument();
    expect(screen.getByText('Combo Finder')).toBeInTheDocument();
    expect(screen.getByText('Syntax Cheat Sheet')).toBeInTheDocument();
  });

  it('renders Guides section heading', () => {
    renderFooter();
    expect(screen.getByText('Guides')).toBeInTheDocument();
  });

  it('renders guide links', () => {
    renderFooter();
    const links = screen.getAllByRole('link');
    const guideLinks = links.filter((l) =>
      l.getAttribute('href')?.startsWith('/guides/'),
    );
    expect(guideLinks.length).toBeGreaterThan(0);
  });

  it('renders "All guides" link when there are more than 5 guides', () => {
    renderFooter();
    const allGuidesLink = screen.getByText('All guides →');
    expect(allGuidesLink.closest('a')).toHaveAttribute('href', '/guides');
  });

  it('renders WotC fan content policy link', () => {
    renderFooter();
    const link = screen.getByText('WotC Fan Content Policy');
    expect(link).toHaveAttribute(
      'href',
      'https://company.wizards.com/en/legal/fancontentpolicy',
    );
  });

  it('has contentinfo role', () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
