/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SALES_EMAIL?: string
  readonly VITE_SUPABASE_DIRECT?: string
  readonly VITE_DEPLOY_ENV?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GRIEVANCE_CONTACT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
