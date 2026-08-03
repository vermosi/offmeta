# src\lib\guide-actions.ts

- ToastFn · type · L1-L1 — type ToastFn = (toast: { title: string; description?: string }) => void;
- buildGuideUrl · function · L5-L7 — function buildGuideUrl(slug: string): string
- copyTextToClipboard · function · L9-L23 — async function copyTextToClipboard( text: string, onToast: ToastFn, successTitle: string, successDescription: string, failureTitle: string, failureDescription: string, ): Promise<void>
