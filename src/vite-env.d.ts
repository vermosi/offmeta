/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY?: string;
  readonly VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY?: string;
  readonly VITE_LOVABLE_CONNECTOR_POSTHOG_PROJECT_ID?: string;
  readonly VITE_LOVABLE_CONNECTOR_POSTHOG_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
