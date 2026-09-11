import { createClient } from '@supabase/supabase-js'

// Placeholders keep `next build` from throwing when env is unset (e.g. Vercel
// preview before project env is configured). Runtime still needs real values.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
