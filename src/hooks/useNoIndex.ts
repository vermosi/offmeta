/**
 * Adds/removes a `<meta name="robots" content="noindex, follow">` tag
 * based on the provided condition. Cleans up on unmount or when
 * the condition becomes false.
 * @module hooks/useNoIndex
 */
import { useEffect } from 'react';

const META_ID = 'dynamic-noindex';

export function useNoIndex(shouldNoIndex: boolean): void {
  useEffect(() => {
    if (!shouldNoIndex) {
      document.getElementById(META_ID)?.remove();
      return;
    }

    let meta = document.getElementById(META_ID) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.id = META_ID;
      meta.name = 'robots';
      meta.content = 'noindex, follow';
      document.head.appendChild(meta);
    }

    return () => {
      document.getElementById(META_ID)?.remove();
    };
  }, [shouldNoIndex]);
}
