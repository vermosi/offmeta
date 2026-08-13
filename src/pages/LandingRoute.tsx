/**
 * Dynamic renderer for registry-declared landing pages.
 * Unknown paths fall through to the 404 route rather than rendering an
 * empty auto-generated page.
 */

import { useLocation } from 'react-router-dom';
import { getLandingPage } from '@/lib/landing';
import { LandingPageView } from '@/components/landing/LandingPageView';
import NotFound from '@/pages/NotFound';

export default function LandingRoute() {
  const { pathname } = useLocation();
  const config = getLandingPage(pathname);

  if (!config) return <NotFound />;

  return <LandingPageView config={config} />;
}
