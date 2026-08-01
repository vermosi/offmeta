type ToastFn = (toast: { title: string; description?: string }) => void;

const GUIDE_BASE_URL = 'https://offmeta.app/guides';

export function buildGuideUrl(slug: string): string {
  return `${GUIDE_BASE_URL}/${slug}`;
}

export async function copyTextToClipboard(
  text: string,
  onToast: ToastFn,
  successTitle: string,
  successDescription: string,
  failureTitle: string,
  failureDescription: string,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    onToast({ title: successTitle, description: successDescription });
  } catch {
    onToast({ title: failureTitle, description: failureDescription });
  }
}
