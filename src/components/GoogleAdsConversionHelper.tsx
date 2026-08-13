import { useEffect } from 'react';

const SCRIPT_ID = 'google-ads-conversion-helper';

/**
 * Injects the Google Ads delayed-navigation helper used to send a conversion
 * event before navigating to a URL. Loaded only on the homepage so the global
 * `gtagSendEvent` function is available for homepage CTAs and outbound links.
 */
export function GoogleAdsConversionHelper() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.innerHTML = `
      function gtagSendEvent(url) {
        if (typeof gtag !== 'function') {
          if (typeof url === 'string') {
            window.location = url;
          }
          return false;
        }
        var callback = function () {
          if (typeof url === 'string') {
            window.location = url;
          }
        };
        gtag('event', 'conversion_event_page_view', {
          'event_callback': callback,
          'event_timeout': 2000,
        });
        return false;
      }
    `;
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.remove();
      }
    };
  }, []);

  return null;
}
