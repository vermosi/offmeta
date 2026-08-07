export interface TrafficClassification {
  isInternal: boolean;
  shouldSuppressInsert: boolean;
}

function getHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}

/**
 * Editor/preview hosts. Covers both the `*-preview--*.lovable.app` preview
 * domains and the `<project-id>.lovableproject.com` in-editor preview, which
 * was previously misclassified as production traffic and polluted analytics.
 */
function isPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.endsWith('.lovableproject.com')) return true;
  return host.includes('-preview--') && host.endsWith('.lovable.app');
}

function readInternalFlag(): boolean {
  try {
    return localStorage.getItem('offmeta_internal') === 'true';
  } catch {
    return false;
  }
}

export function classifyTraffic(): TrafficClassification {
  const host = getHostname();
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '';
  const isPreview = isPreviewHost(host);
  const isInternal = isLocal || isPreview || readInternalFlag();

  return {
    isInternal,
    shouldSuppressInsert: isLocal || isPreview,
  };
}
