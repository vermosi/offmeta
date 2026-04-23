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

  it('renders core internal links (search-first nav)', () => {
    renderFooter();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/guides');
    expect(hrefs).toContain('/combos');
    expect(hrefs).toContain('/about');
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

  it('renders Data Sources section with Moxfield, Commander Spellbook, and Spicerack', () => {
    renderFooter();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.getByText('Moxfield').closest('a')).toHaveAttribute('href', 'https://www.moxfield.com');
    expect(screen.getByText('Commander Spellbook').closest('a')).toHaveAttribute('href', 'https://commanderspellbook.com');
    expect(screen.getByText('Spicerack').closest('a')).toHaveAttribute('href', 'https://spicerack.gg');
  });

  it('renders Built With section with tech stack links', () => {
    renderFooter();
    expect(screen.getByText('Built With')).toBeInTheDocument();
    expect(screen.getByText('React').closest('a')).toHaveAttribute('href', 'https://react.dev');
    expect(screen.getByText('TypeScript').closest('a')).toHaveAttribute('href', 'https://www.typescriptlang.org');
    expect(screen.getByText('Tailwind CSS').closest('a')).toHaveAttribute('href', 'https://tailwindcss.com');
    expect(screen.getByText('Vite').closest('a')).toHaveAttribute('href', 'https://vitejs.dev');
    expect(screen.getByText('Lovable').closest('a')).toHaveAttribute('href', 'https://lovable.dev');
  });
});
