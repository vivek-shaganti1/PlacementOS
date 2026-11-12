// Public configuration (the same values the website ships). Overridden by EXPO_PUBLIC_* for local or staging work.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oewjimwozaksyigfyrkz.supabase.co'
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_l4oFZfheVfvTBAfU3t9sRg_AwdkNqse'
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://placementiq-os.vercel.app').replace(/\/$/, '')
