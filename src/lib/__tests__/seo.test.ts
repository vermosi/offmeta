import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applySeoMeta } from '../seo';

describe('applySeoMeta', () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = document.title;
  });

  afterEach(() => {
    document.title = originalTitle;
    // Clean up any meta tags we added
    document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]').forEach((el) => el.remove());
    document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('sets document title', () => {
    applySeoMeta({ title: 'Test Page', description: 'Desc', url: 'https://example.com' });
    expect(document.title).toBe('Test Page');
  });

  it('sets meta description', () => {
    applySeoMeta({ title: 'T', description: 'My description', url: 'https://example.com' });
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    expect(meta?.content).toBe('My description');
  });

  it('sets Open Graph tags', () => {
    applySeoMeta({ title: 'OG Title', description: 'OG Desc', url: 'https://example.com/page' });
    expect((document.querySelector('meta[property="og:title"]') as HTMLMetaElement)?.content).toBe('OG Title');
    expect((document.querySelector('meta[property="og:url"]') as HTMLMetaElement)?.content).toBe('https://example.com/page');
  });

  it('sets Twitter Card tags', () => {
    applySeoMeta({ title: 'TW', description: 'TW Desc', url: 'https://example.com' });
    expect((document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement)?.content).toBe('TW');
  });

  it('sets canonical link', () => {
    applySeoMeta({ title: 'T', description: 'D', url: 'https://example.com/canonical' });
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(link?.href).toBe('https://example.com/canonical');
  });

  it('sets og:image when image provided', () => {
    applySeoMeta({ title: 'T', description: 'D', url: 'https://x.com', image: 'https://x.com/img.png' });
    expect((document.querySelector('meta[property="og:image"]') as HTMLMetaElement)?.content).toBe('https://x.com/img.png');
  });

  it('defaults og:type to article', () => {
    applySeoMeta({ title: 'T', description: 'D', url: 'https://x.com' });
    expect((document.querySelector('meta[property="og:type"]') as HTMLMetaElement)?.content).toBe('article');
  });

  it('allows custom og:type', () => {
    applySeoMeta({ title: 'T', description: 'D', url: 'https://x.com', type: 'website' });
    expect((document.querySelector('meta[property="og:type"]') as HTMLMetaElement)?.content).toBe('website');
  });

  it('cleanup restores previous title', () => {
    document.title = 'Original';
    const cleanup = applySeoMeta({ title: 'Changed', description: 'D', url: 'https://x.com' });
    expect(document.title).toBe('Changed');
    cleanup();
    expect(document.title).toBe('Original');
  });

  it('updates existing meta tags instead of duplicating', () => {
    applySeoMeta({ title: 'First', description: 'First', url: 'https://x.com' });
    applySeoMeta({ title: 'Second', description: 'Second', url: 'https://x.com' });
    const metas = document.querySelectorAll('meta[name="description"]');
    expect(metas).toHaveLength(1);
  });
});
