import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Using default Supabase client types ( looser but easier for setup )
// For full type safety, run: npx supabase gen types typescript > src/lib/database.types.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type { Database }
