export interface TrafficClassification {
  isInternal: boolean;
  shouldSuppressInsert: boolean;
}

function getHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}

function isPreviewHost(hostname: string): boolean {
  return hostname.includes('-preview--') && hostname.endsWith('.lovable.app');
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
