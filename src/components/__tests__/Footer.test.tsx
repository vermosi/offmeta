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
    const copyrightElements = screen.getAllByText(new RegExp(`© ${year}`));
    expect(copyrightElements.length).toBeGreaterThan(0);
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
    const link = screen.getByLabelText('Powered by Scryfall (opens in new tab)');
    expect(link).toHaveAttribute('href', 'https://scryfall.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders guide links', () => {
    renderFooter();
    expect(screen.getByText('Guides:')).toBeInTheDocument();
    // At least one guide link should exist
    const links = screen.getAllByRole('link');
    const guideLinks = links.filter((l) =>
      l.getAttribute('href')?.startsWith('/guides/'),
    );
    expect(guideLinks.length).toBeGreaterThan(0);
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
