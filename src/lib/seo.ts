/**
 * Shared SEO utilities for setting document head meta tags.
 * Avoids duplicating meta-tag management across pages.
 */

interface SeoOptions {
  title: string;
  description: string;
  url: string;
  type?: string;
  image?: string;
}

/** Set or update a <meta> element in the document head. */
function setMeta(nameOrProp: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Set or update the canonical <link> element. */
function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

/**
 * Apply SEO meta tags, Open Graph, Twitter Card, and canonical URL.
 * Call from a useEffect and return the cleanup function.
 */
export function applySeoMeta(opts: SeoOptions): () => void {
  const prevTitle = document.title;
  document.title = opts.title;

  setMeta('description', opts.description);
  setMeta('og:title', opts.title, 'property');
  setMeta('og:description', opts.description, 'property');
  setMeta('og:url', opts.url, 'property');
  setMeta('og:type', opts.type ?? 'article', 'property');
  setMeta('twitter:title', opts.title);
  setMeta('twitter:description', opts.description);

  if (opts.image) {
    setMeta('og:image', opts.image, 'property');
    setMeta('twitter:image', opts.image);
  }

  setCanonical(opts.url);

  return () => {
    document.title = prevTitle;
    setCanonical('https://offmeta.app/');
  };
}
