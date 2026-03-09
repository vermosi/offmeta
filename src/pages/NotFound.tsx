import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { logger } from '@/lib/core/logger';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    logger.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <SkipLinks />
      <Header />

      <main id="main-content" className="relative flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="text-8xl font-black text-primary/20 select-none">404</div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('notFound.title')}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('notFound.description', "The page you're looking for doesn't exist or has been moved.")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="default" className="gap-2">
              <Link to="/">
                <Search className="h-4 w-4" />
                {t('notFound.searchCards', 'Search Cards')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                {t('notFound.backHome')}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
