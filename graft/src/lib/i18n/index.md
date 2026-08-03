# src\lib\i18n\index.tsx

- TranslationDictionary · type · L31-L31 — type TranslationDictionary = Record<string, string>;
- IdleWindow · type · L62-L65 — type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void; };
- scheduleIdle · function · L67-L75 — function scheduleIdle(cb: () => void): () => void
- resolveInitialLocale · function · L77-L89 — function resolveInitialLocale(): SupportedLocale
- I18nProviderProps · interface · L91-L93 — interface I18nProviderProps
- I18nProvider · function · L104-L179 — function I18nProvider({ children }: I18nProviderProps)
